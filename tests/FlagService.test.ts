import { describe, it, expect, beforeEach } from "vitest";
import {
  AuditLog,
  FlagService,
  InMemoryFlagStore,
  stablePercent,
} from "../src/index.js";

describe("FlagService", () => {
  let store: InMemoryFlagStore;
  let audit: AuditLog;
  let service: FlagService;

  beforeEach(() => {
    store = new InMemoryFlagStore();
    audit = new AuditLog();
    service = new FlagService(store, audit);
  });

  it("returns defaultEnabled when no kill switch or rollout", () => {
    service.setFlag("tenant-a", {
      key: "new-ui",
      defaultEnabled: true,
    });
    expect(service.evaluate("new-ui", { tenantId: "tenant-a" })).toBe(true);

    service.setFlag("tenant-a", {
      key: "beta",
      defaultEnabled: false,
    });
    expect(service.evaluate("beta", { tenantId: "tenant-a" })).toBe(false);
  });

  it("kill switch overrides default and rollout to false", () => {
    service.setFlag("tenant-a", {
      key: "payments",
      defaultEnabled: true,
      rolloutPercent: 100,
    });
    expect(service.evaluate("payments", { tenantId: "tenant-a", userId: "u1" })).toBe(
      true,
    );

    service.enableKillSwitch("tenant-a", "payments");
    expect(service.evaluate("payments", { tenantId: "tenant-a", userId: "u1" })).toBe(
      false,
    );
    expect(service.evaluate("payments", { tenantId: "tenant-a" })).toBe(false);
  });

  it("rollout boundaries: 0% never, 100% always (when not killed)", () => {
    service.setFlag("tenant-b", {
      key: "search-v2",
      defaultEnabled: false,
      rolloutPercent: 0,
    });
    for (let i = 0; i < 20; i++) {
      expect(
        service.evaluate("search-v2", { tenantId: "tenant-b", userId: `user-${i}` }),
      ).toBe(false);
    }

    service.setRollout("tenant-b", "search-v2", 100);
    for (let i = 0; i < 20; i++) {
      expect(
        service.evaluate("search-v2", { tenantId: "tenant-b", userId: `user-${i}` }),
      ).toBe(true);
    }
  });

  it("rollout is deterministic for the same seed", () => {
    service.setFlag("tenant-c", {
      key: "exp",
      defaultEnabled: false,
      rolloutPercent: 50,
    });
    const ctx = { tenantId: "tenant-c", userId: "stable-user" };
    const a = service.evaluate("exp", ctx);
    const b = service.evaluate("exp", ctx);
    expect(a).toBe(b);

    const seed = "tenant-c:stable-user:exp";
    const bucket = stablePercent(seed);
    expect(a).toBe(bucket < 50);
  });

  it("records audit trail entries for mutations and evaluates", () => {
    service.setFlag("tenant-d", {
      key: "checkout",
      defaultEnabled: true,
    });
    service.setRollout("tenant-d", "checkout", 25);
    service.enableKillSwitch("tenant-d", "checkout");
    service.evaluate("checkout", { tenantId: "tenant-d", userId: "u9" });

    const events = audit.list();
    expect(events.length).toBeGreaterThanOrEqual(4);

    const actions = events.map((e) => e.action);
    expect(actions).toContain("setFlag");
    expect(actions).toContain("setRollout");
    expect(actions).toContain("enableKillSwitch");
    expect(actions).toContain("evaluate");

    const copy = audit.list();
    copy.pop();
    expect(audit.list().length).toBe(events.length);

    const killEval = events.find(
      (e) => e.action === "evaluate" && e.details?.reason === "kill_switch",
    );
    expect(killEval).toBeDefined();
    expect(killEval?.details?.result).toBe(false);
  });

  it("returns false for unknown flags", () => {
    expect(service.evaluate("missing", { tenantId: "t" })).toBe(false);
  });
});

describe("stablePercent", () => {
  it("returns 0..99 and is stable", () => {
    const v = stablePercent("hello");
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(100);
    expect(stablePercent("hello")).toBe(v);
    expect(stablePercent("world")).not.toBe(v);
  });
});
