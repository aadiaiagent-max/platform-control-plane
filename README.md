# @aadiaiagent/platform-control-plane

**Principal / Staff SWE showcase** — a zero-runtime-dependency TypeScript library for multi-tenant feature flags, kill switches, percentage rollouts, and an append-only audit log.

Designed as a **platform control plane**: tenants configure flags independently; evaluation is deterministic; every mutation is auditable.

## Architecture

```mermaid
flowchart LR
  Client[Client / Service] --> FlagService
  FlagService --> Store[InMemoryFlagStore]
  FlagService --> Audit[AuditLog]
```

| Component | Role |
|-----------|------|
| `FlagService` | Mutations + evaluation with kill-switch / rollout / default precedence |
| `InMemoryFlagStore` | Tenant-scoped flag definitions |
| `AuditLog` | Append-only event history |
| `stablePercent` | Deterministic FNV-1a hash → bucket `0..99` |

## Quickstart

```bash
npm install
npm run typecheck
npm test
npm run example
```

```ts
import {
  AuditLog,
  FlagService,
  InMemoryFlagStore,
} from "@aadiaiagent/platform-control-plane";

const store = new InMemoryFlagStore();
const audit = new AuditLog();
const flags = new FlagService(store, audit);

flags.setFlag("acme", {
  key: "checkout-v2",
  defaultEnabled: false,
  rolloutPercent: 10,
});

const enabled = flags.evaluate("checkout-v2", {
  tenantId: "acme",
  userId: "user-42",
});
```

**Requirements:** Node 20+, ESM. No API keys. Runtime deps: none.

## Design

### Evaluation precedence

```
kill switch  >  rollout percent  >  defaultEnabled
```

1. **Kill switch** — if `killSwitch === true`, always `false` (incident response).
2. **Rollout** — if `rolloutPercent` is set, user is in cohort when `stablePercent(tenantId:userId:key) < rolloutPercent`.
3. **Default** — otherwise return `defaultEnabled`.

### Deterministic hashing

`stablePercent(seed)` uses FNV-1a mapped to `[0, 99]`. Same `(tenantId, userId, key)` always lands in the same bucket.

### Audit

Every `setFlag`, `enableKillSwitch`, `setRollout`, and `evaluate` appends an `AuditEvent`. The log never mutates or deletes prior entries.

## Layout

```
src/
  types.ts
  hash.ts
  store/InMemoryFlagStore.ts
  audit/AuditLog.ts
  flags/FlagService.ts
  index.ts
tests/FlagService.test.ts
examples/basic.ts
```

## Roadmap

- **Remote store** — Redis / Postgres-backed `FlagStore`
- **RBAC** — actor identity on mutations
- Signed config snapshots and webhook fan-out

## License

MIT © 2026 aadiaiagent-max
