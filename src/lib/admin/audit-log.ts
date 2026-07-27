import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditLogParams = {
  actorId: string;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

async function writeAuditLog(params: AuditLogParams) {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("admin_audit_log").insert({
      actor_id: params.actorId,
      action: params.action,
      summary: params.summary,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
    if (error) console.error("[audit]", error.message);
  } catch (e) {
    console.error("[audit]", e);
  }
}

/** Kurzform für neue Aufrufer. */
export async function auditLog(params: AuditLogParams) {
  await writeAuditLog(params);
}

/** Legacy-Signatur (admin-Client wird ignoriert — Insert läuft immer per Service-Role). */
export async function logAdminAction(
  _admin: SupabaseClient,
  params: AuditLogParams,
) {
  await writeAuditLog(params);
}
