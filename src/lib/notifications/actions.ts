"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
export type UserNotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link_url: string | null;
  link_label: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export async function fetchMyNotifications(limit = 30): Promise<{
  items: UserNotificationRow[];
  unreadCount: number;
  available: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0, available: true };

  const { data: items, error } = await supabase
    .from("user_notifications")
    .select("id,kind,title,body,link_url,link_label,read_at,created_at,metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (/does not exist|relation.*not found/i.test(error.message)) {
      return { items: [], unreadCount: 0, available: false };
    }
    throw new Error(error.message);
  }

  const { count, error: countErr } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (countErr && !/user_notifications|does not exist/i.test(countErr.message)) {
    throw new Error(countErr.message);
  }

  return {
    items: (items ?? []) as UserNotificationRow[],
    unreadCount: count ?? 0,
    available: true,
  };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createSupabaseServerClient();
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

export async function markAllNotificationsRead() {
  const supabase = await createSupabaseServerClient();
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
