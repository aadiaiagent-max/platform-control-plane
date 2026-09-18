import type { FlagDefinition, TenantId } from "../types.js";

/**
 * In-memory multi-tenant flag store.
 * Keys are scoped as `${tenantId}::${flagKey}` for tenant isolation.
 */
export class InMemoryFlagStore {
  private readonly flags = new Map<string, FlagDefinition>();

  private scopeKey(tenantId: TenantId, key: string): string {
    return `${tenantId}::${key}`;
  }

  get(tenantId: TenantId, key: string): FlagDefinition | undefined {
    return this.flags.get(this.scopeKey(tenantId, key));
  }

  set(tenantId: TenantId, definition: FlagDefinition): void {
    this.flags.set(this.scopeKey(tenantId, definition.key), { ...definition });
  }

  list(tenantId: TenantId): FlagDefinition[] {
    const prefix = `${tenantId}::`;
    const result: FlagDefinition[] = [];
    for (const [scoped, def] of this.flags) {
      if (scoped.startsWith(prefix)) {
        result.push({ ...def });
      }
    }
    return result;
  }

  clear(): void {
    this.flags.clear();
  }
}
