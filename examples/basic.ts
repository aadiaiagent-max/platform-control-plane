/**
 * Basic multi-tenant control-plane walkthrough.
 * Run: npm run example
 */
import {
  AuditLog,
  FlagService,
  InMemoryFlagStore,
} from "../src/index.js";

const store = new InMemoryFlagStore();
const audit = new AuditLog();
const flags = new FlagService(store, audit);

const tenant = "acme-corp";

flags.setFlag(tenant, {
  key: "new-dashboard",
  defaultEnabled: false,
  rolloutPercent: 30,
});

console.log("--- Percentage rollout (30%) ---");
for (const userId of ["alice", "bob", "carol", "dave", "erin"]) {
  const on = flags.evaluate("new-dashboard", { tenantId: tenant, userId });
  console.log(`  user=${userId} => ${on}`);
}

console.log("\n--- Enable kill switch ---");
flags.enableKillSwitch(tenant, "new-dashboard");
console.log(
  "  evaluate after kill =>",
  flags.evaluate("new-dashboard", { tenantId: tenant, userId: "alice" }),
);

console.log("\n--- Audit trail ---");
for (const evt of audit.list()) {
  console.log(`  [${evt.timestamp}] ${evt.action} ${evt.flagKey}`, evt.details ?? "");
}
