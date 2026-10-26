import { prisma } from "./db";

export interface AuditLogParams {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, any>;
}

/**
 * Creates an audit log record for every administrative, host, or privileged action
 */
export async function logAuditEvent({
  actorId,
  action,
  entity,
  entityId,
  metadata,
}: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("[AuditLog Error]: Failed to persist audit log", error);
    // Return null rather than failing user flow, but log to stderr
    return null;
  }
}

/**
 * Convenience positional wrapper around logAuditEvent
 * Usage: writeAuditLog(actorId, "ACTION", "entity", "entityId", { ...metadata })
 */
export async function writeAuditLog(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  return logAuditEvent({ actorId, action, entity, entityId, metadata });
}
