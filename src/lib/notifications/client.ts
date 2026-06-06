import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserNotificationRow } from "@/lib/notifications/actions";

export async function fetchNotificationsForUser(
  supabase: SupabaseClient,
  limit = 40,
): Promise<{ items: UserNotificationRow[]; unreadCount: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0 };

  const { data: items, error } = await supabase
    .from("user_notifications")
    .select("id,kind,title,body,link_url,link_label,read_at,created_at,metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (items ?? []) as UserNotificationRow[];
  return {
    items: rows,
    unreadCount: rows.filter((r) => !r.read_at).length,
  };
}

export async function markNotificationReadClient(
  supabase: SupabaseClient,
  notificationId: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);
}

export async function markAllNotificationsReadClient(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}
