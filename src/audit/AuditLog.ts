import type { AuditEvent } from "../types.js";

/**
 * Append-only audit log. Mutations never rewrite or delete prior events.
 */
export class AuditLog {
  private readonly events: AuditEvent[] = [];
  private seq = 0;

  append(
    event: Omit<AuditEvent, "id" | "timestamp"> & {
      id?: string;
      timestamp?: string;
    },
  ): AuditEvent {
    this.seq += 1;
    const recorded: AuditEvent = {
      id: event.id ?? `evt-${this.seq}`,
      timestamp: event.timestamp ?? new Date().toISOString(),
      action: event.action,
      flagKey: event.flagKey,
      ...(event.tenantId !== undefined ? { tenantId: event.tenantId } : {}),
      ...(event.details !== undefined ? { details: event.details } : {}),
    };
    this.events.push(recorded);
    return recorded;
  }

  /** Returns a shallow copy of all events in append order. */
  list(): AuditEvent[] {
    return [...this.events];
  }
}
