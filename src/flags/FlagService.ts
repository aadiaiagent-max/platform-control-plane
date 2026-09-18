import type { AuditLog } from "../audit/AuditLog.js";
import { stablePercent } from "../hash.js";
import type { InMemoryFlagStore } from "../store/InMemoryFlagStore.js";
import type { EvalContext, FlagDefinition, TenantId } from "../types.js";

/**
 * Multi-tenant feature-flag control plane.
 *
 * Evaluation precedence (highest wins):
 *   1. Kill switch → false
 *   2. Rollout percent (stable hash of tenantId+userId+key)
 *   3. defaultEnabled
 */
export class FlagService {
  constructor(
    private readonly store: InMemoryFlagStore,
    private readonly audit: AuditLog,
  ) {}

  setFlag(tenantId: TenantId, definition: FlagDefinition): void {
    this.store.set(tenantId, definition);
    this.audit.append({
      action: "setFlag",
      flagKey: definition.key,
      tenantId,
      details: {
        defaultEnabled: definition.defaultEnabled,
        killSwitch: definition.killSwitch ?? false,
        rolloutPercent: definition.rolloutPercent,
      },
    });
  }

  enableKillSwitch(tenantId: TenantId, key: string): void {
    const existing = this.store.get(tenantId, key);
    if (!existing) {
      throw new Error(`Flag not found: ${key} (tenant ${tenantId})`);
    }
    this.store.set(tenantId, { ...existing, killSwitch: true });
    this.audit.append({
      action: "enableKillSwitch",
      flagKey: key,
      tenantId,
      details: { killSwitch: true },
    });
  }

  setRollout(tenantId: TenantId, key: string, rolloutPercent: number): void {
    if (rolloutPercent < 0 || rolloutPercent > 100) {
      throw new Error(`rolloutPercent must be 0–100, got ${rolloutPercent}`);
    }
    const existing = this.store.get(tenantId, key);
    if (!existing) {
      throw new Error(`Flag not found: ${key} (tenant ${tenantId})`);
    }
    this.store.set(tenantId, { ...existing, rolloutPercent });
    this.audit.append({
      action: "setRollout",
      flagKey: key,
      tenantId,
      details: { rolloutPercent },
    });
  }

  evaluate(key: string, ctx: EvalContext): boolean {
    const def = this.store.get(ctx.tenantId, key);
    if (!def) {
      this.audit.append({
        action: "evaluate",
        flagKey: key,
        tenantId: ctx.tenantId,
        details: { result: false, reason: "not_found", userId: ctx.userId },
      });
      return false;
    }

    if (def.killSwitch === true) {
      this.audit.append({
        action: "evaluate",
        flagKey: key,
        tenantId: ctx.tenantId,
        details: { result: false, reason: "kill_switch", userId: ctx.userId },
      });
      return false;
    }

    let result: boolean;
    let reason: string;

    if (def.rolloutPercent !== undefined) {
      const userPart = ctx.userId ?? "";
      const seed = `${ctx.tenantId}:${userPart}:${key}`;
      const bucket = stablePercent(seed);
      result = bucket < def.rolloutPercent;
      reason = result ? "rollout_in" : "rollout_out";
    } else {
      result = def.defaultEnabled;
      reason = "default";
    }

    this.audit.append({
      action: "evaluate",
      flagKey: key,
      tenantId: ctx.tenantId,
      details: { result, reason, userId: ctx.userId },
    });

    return result;
  }
}
