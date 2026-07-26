"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { extractMentionUserIds } from "@/lib/mentions/format";
import { deleteNotificationsByMetadata } from "@/lib/notifications/cleanup";
import {
  GROUP_CHAT_COOLDOWN_MS,
  GROUP_CHAT_MAX_LEN,
  type GroupChatMessageRow,
} from "@/lib/chat/constants";

async function notifyChatMentions(text: string, messageId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();
  const actorName =
    me?.first_name && me?.last_name
      ? `${me.first_name} ${me.last_name}`
      : "Jemand";

  const ids = extractMentionUserIds(text).filter((id) => id !== user.id);
  if (!ids.length) return;

  await Promise.all(
    ids.map((userId) =>
      createUserNotification({
        userId,
        kind: NOTIFICATION_KINDS.mention,
        title: `${actorName} hat dich markiert`,
        body: "Du wurdest im Gruppenchat erwähnt.",
        linkUrl: "/chat",
        linkLabel: "Zum Chat",
        metadata: { chat_message_id: messageId, context: "chat" },
      }).catch(() => null),
    ),
  );
}

export async function sendGroupChatMessage(bodyRaw: string): Promise<{
  ok: true;
  message: GroupChatMessageRow;
} | { ok: false; error: string; retryAfterMs?: number }> {
  const body = bodyRaw.trim();
  if (!body) return { ok: false, error: "Nachricht darf nicht leer sein." };
  if (body.length > GROUP_CHAT_MAX_LEN) {
    return { ok: false, error: `Maximal ${GROUP_CHAT_MAX_LEN} Zeichen.` };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: last } = await supabase
    .from("group_chat_messages")
    .select("created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.created_at) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < GROUP_CHAT_COOLDOWN_MS) {
      return {
        ok: false,
        error: "Bitte kurz warten, bevor du erneut schreibst.",
        retryAfterMs: GROUP_CHAT_COOLDOWN_MS - elapsed,
      };
    }
  }

  const { data, error } = await supabase
    .from("group_chat_messages")
    .insert({ author_id: user.id, body })
    .select("id,author_id,body,created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Senden fehlgeschlagen." };
  }

  void notifyChatMentions(body, data.id);
  return { ok: true, message: data as GroupChatMessageRow };
}

export async function deleteGroupChatMessage(messageId: string): Promise<{
  ok: true;
} | { ok: false; error: string }> {
  const id = messageId.trim();
  if (!id) return { ok: false, error: "Ungültige Nachricht." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: row } = await supabase
    .from("group_chat_messages")
    .select("author_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Nachricht nicht gefunden." };

  const canDelete = row.author_id === user.id || me?.role === "admin";
  if (!canDelete) {
    return { ok: false, error: "Keine Berechtigung zum Löschen." };
  }

  const { error } = await supabase.from("group_chat_messages").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await deleteNotificationsByMetadata("chat_message_id", id).catch(() => null);
  return { ok: true };
}
