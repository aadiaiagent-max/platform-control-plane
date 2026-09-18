/** Opaque tenant identifier for multi-tenant isolation. */
export type TenantId = string;

/** Definition of a feature flag with optional kill switch and rollout. */
export interface FlagDefinition {
  key: string;
  defaultEnabled: boolean;
  /** When true, evaluation always returns false (highest precedence). */
  killSwitch?: boolean;
  /** Percentage of traffic (0–100) eligible when not killed; uses stable hash. */
  rolloutPercent?: number;
}

/** Context supplied at evaluation time. */
export interface EvalContext {
  tenantId: TenantId;
  userId?: string;
}

/** Append-only audit event recorded for control-plane mutations and evaluations of interest. */
export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  flagKey: string;
  tenantId?: TenantId;
  details?: Record<string, unknown>;
}
