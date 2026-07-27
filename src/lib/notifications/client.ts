import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserNotificationRow } from "@/lib/notifications/actions";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { isBadgeSlugEnabled, isFeatureEnabled } from "@/lib/feature-flags";

function isNotificationVisible(row: UserNotificationRow): boolean {
  const kind = row.kind;
  if (
    kind === NOTIFICATION_KINDS.radioVotingLastChance ||
    kind === NOTIFICATION_KINDS.radioVotingAvailable ||
    kind === NOTIFICATION_KINDS.radioVotingNewCycle
  ) {
    return isFeatureEnabled("votings");
  }
  if (
    kind === NOTIFICATION_KINDS.merchandiseOrderConfirmed ||
    kind === NOTIFICATION_KINDS.merchandiseOrderAdmin
  ) {
    return isFeatureEnabled("merchandise");
  }
  if (kind === NOTIFICATION_KINDS.badgeUnlocked) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as { achievement_slug?: unknown; slug?: unknown })
        : null;
    const slug = String(meta?.achievement_slug ?? meta?.slug ?? "");
    if (slug && !isBadgeSlugEnabled(slug)) return false;
  }
  return true;
}

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

  const rows = ((items ?? []) as UserNotificationRow[]).filter(isNotificationVisible);
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
