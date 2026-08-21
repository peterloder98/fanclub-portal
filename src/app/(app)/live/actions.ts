"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canMembersJoinSession,
  canMembersUseLiveChat,
  LIVE_SESSION_CHAT_COOLDOWN_MS,
  LIVE_SESSION_CHAT_MAX_LEN,
  LIVE_SESSION_QUESTION_MAX_LEN,
  type LiveSessionRow,
} from "@/lib/live/types";
import { syncLiveSessionLifecycle } from "@/lib/live/cleanup";
import { assertMemberCanWrite } from "@/lib/portal-launch";

async function requireActiveMember() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nicht angemeldet." };

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!membership && profile?.role !== "admin") {
    return { ok: false as const, error: "Nur aktive Mitglieder." };
  }
  try {
    assertMemberCanWrite(profile?.role ?? "member");
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nicht erlaubt." };
  }
  return { ok: true as const, user, supabase, isAdmin: profile?.role === "admin" };
}

const SESSION_SELECT =
  "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at";

async function requireChatSession(sessionId: string) {
  const gate = await requireActiveMember();
  if (!gate.ok) return gate;

  const { data: session } = await gate.supabase
    .from("live_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { ok: false as const, error: "Session nicht gefunden." };
  const row = session as LiveSessionRow;
  const phase = await syncLiveSessionLifecycle(createSupabaseAdminClient(), row);
  if (phase === "gone") {
    return { ok: false as const, error: "Session ist beendet." };
  }
  if (phase === "grace") {
    return { ok: true as const, user: gate.user, supabase: gate.supabase, session: { ...row, status: "ended" as const } };
  }
  if (!canMembersUseLiveChat(row) && !canMembersJoinSession(row)) {
    return { ok: false as const, error: "Session ist nicht geöffnet." };
  }
  return { ok: true as const, user: gate.user, supabase: gate.supabase, session: row };
}

/** Fragen: vorab (Lobby) und live — Session darf geplant/live sein, nicht im Nachlauf/beendet. */
async function requireQuestionableSession(sessionId: string) {
  const gate = await requireActiveMember();
  if (!gate.ok) return gate;

  const { data: session } = await gate.supabase
    .from("live_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { ok: false as const, error: "Session nicht gefunden." };
  const row = session as LiveSessionRow;
  const phase = await syncLiveSessionLifecycle(createSupabaseAdminClient(), row);
  if (phase !== "active") {
    return { ok: false as const, error: "Session ist beendet." };
  }
  if (row.status === "ended" || row.status === "cancelled") {
    return { ok: false as const, error: "Session ist beendet." };
  }
  if (new Date() > new Date(row.ends_at)) {
    return { ok: false as const, error: "Session-Zeitfenster vorbei." };
  }
  return { ok: true as const, user: gate.user, supabase: gate.supabase, session: row };
}

export async function sendLiveSessionMessage(
  sessionId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string; retryAfterMs?: number }> {
  const gate = await requireChatSession(sessionId);
  if (!gate.ok) return gate;

  const text = body.trim().slice(0, LIVE_SESSION_CHAT_MAX_LEN);
  if (!text) return { ok: false, error: "Nachricht leer." };

  const { data: last } = await gate.supabase
    .from("live_session_messages")
    .select("created_at")
    .eq("session_id", sessionId)
    .eq("author_id", gate.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.created_at) {
    const elapsed = Date.now() - new Date(last.created_at).getTime();
    if (elapsed < LIVE_SESSION_CHAT_COOLDOWN_MS) {
      return {
        ok: false,
        error: "Bitte kurz warten, bevor du erneut schreibst.",
        retryAfterMs: LIVE_SESSION_CHAT_COOLDOWN_MS - elapsed,
      };
    }
  }

  const { error } = await gate.supabase.from("live_session_messages").insert({
    session_id: sessionId,
    author_id: gate.user.id,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitLiveSessionQuestion(
  sessionId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireQuestionableSession(sessionId);
  if (!gate.ok) return gate;

  const text = body.trim().slice(0, LIVE_SESSION_QUESTION_MAX_LEN);
  if (!text) return { ok: false, error: "Frage leer." };

  const { data: existing } = await gate.supabase
    .from("live_session_questions")
    .select("id")
    .eq("session_id", sessionId)
    .eq("author_id", gate.user.id)
    .is("dismissed_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: "Du hast bereits eine offene Frage. Pro Person ist nur eine erlaubt.",
    };
  }

  const { error } = await gate.supabase.from("live_session_questions").insert({
    session_id: sessionId,
    author_id: gate.user.id,
    body: text,
  });
  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      return {
        ok: false,
        error: "Du hast bereits eine offene Frage. Pro Person ist nur eine erlaubt.",
      };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteLiveSessionMessage(
  messageId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: msg } = await supabase
    .from("live_session_messages")
    .select("id,author_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg) return { ok: false, error: "Nachricht nicht gefunden." };

  const isAdmin = profile?.role === "admin";
  if (!isAdmin && msg.author_id !== user.id) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const { error } = await supabase.from("live_session_messages").delete().eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteLiveSessionQuestion(
  questionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Nur Admin." };
  }

  const { error } = await supabase
    .from("live_session_questions")
    .delete()
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
