import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NotificationKind } from "@/lib/notifications/kinds";

export type CreateNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  metadata?: Record<string, unknown>;
};

let tableMissingLogged = false;

export async function createUserNotification(
  input: CreateNotificationInput,
): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      link_url: input.linkUrl?.trim() || null,
      link_label: input.linkLabel?.trim() || null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    if (/user_notifications|does not exist/i.test(error.message)) {
      if (!tableMissingLogged) {
        tableMissingLogged = true;
        console.warn(
          "[notifications] Tabelle user_notifications fehlt — bitte supabase/059_user_notifications.sql ausführen.",
        );
      }
      return null;
    }
    console.error("[notifications] insert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

function notificationRow(userId: string, input: Omit<CreateNotificationInput, "userId">) {
  return {
    user_id: userId,
    kind: input.kind,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    link_url: input.linkUrl?.trim() || null,
    link_label: input.linkLabel?.trim() || null,
    metadata: input.metadata ?? {},
  };
}

export async function createNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;

  const admin = createSupabaseAdminClient();
  const chunkSize = 200;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { error } = await admin
      .from("user_notifications")
      .insert(chunk.map((userId) => notificationRow(userId, input)));
    if (error) {
      if (/user_notifications|does not exist/i.test(error.message)) {
        if (!tableMissingLogged) {
          tableMissingLogged = true;
          console.warn(
            "[notifications] Tabelle user_notifications fehlt — bitte supabase/059_user_notifications.sql ausführen.",
          );
        }
        return;
      }
      console.error("[notifications] batch insert failed:", error.message);
      for (const userId of chunk) {
        await createUserNotification({ ...input, userId });
      }
    }
  }
}

export async function notifyAllActiveMembers(
  input: Omit<CreateNotificationInput, "userId">,
) {
  const admin = createSupabaseAdminClient();
  const { data: memberships, error } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  if (error) {
    console.error("[notifications] active members:", error.message);
    return;
  }
  const userIds = (memberships ?? []).map((m) => m.user_id).filter(Boolean) as string[];
  await createNotificationsForUsers(userIds, input);
}

export async function notifyAllAdmins(input: Omit<CreateNotificationInput, "userId">) {
  const admin = createSupabaseAdminClient();
  const { data: admins, error } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (error) {
    console.error("[notifications] admins:", error.message);
    return;
  }
  const userIds = (admins ?? []).map((a) => a.id);
  await createNotificationsForUsers(userIds, input);
}
