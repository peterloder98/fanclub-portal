import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NotificationKind } from "@/lib/notifications/kinds";

export async function hasNotificationDedupe(
  userId: string,
  kind: NotificationKind,
  dedupeKey: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .filter("metadata->>dedupe_key", "eq", dedupeKey)
    .limit(1);
  if (error) {
    if (/user_notifications|does not exist/i.test(error.message)) return false;
    console.error("[notifications] dedup check:", error.message);
    return false;
  }
  return Boolean(data?.length);
}
