import { prisma } from "./prisma";

/**
 * Generic audit action types.
 * Extend this union with your app-specific actions as needed, e.g.:
 *   | "quote.created" | "quote.approved" | "case.finalized"
 */
type AuditAction =
  | "user.created"
  | "user.role_changed"
  | "user.invited"
  | "settings.updated"
  // Add your app-specific actions here
  | string; // fallback for ad-hoc actions

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch {
    // Audit failures must never break the main flow
  }
}
