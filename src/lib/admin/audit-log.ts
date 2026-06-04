import type { SupabaseClient } from "@supabase/supabase-js";

export async function logAdminAction(
  admin: SupabaseClient,
  params: {
    actorId: string;
    action: string;
    summary: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("admin_audit_log").insert({
    actor_id: params.actorId,
    action: params.action,
    summary: params.summary,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
