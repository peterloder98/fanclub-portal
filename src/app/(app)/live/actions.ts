"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canMembersJoinSession,
  LIVE_SESSION_CHAT_MAX_LEN,
  LIVE_SESSION_QUESTION_MAX_LEN,
  type LiveSessionRow,
} from "@/lib/live/types";

async function requireJoinableSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nicht angemeldet." };

  const { data: session } = await supabase
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { ok: false as const, error: "Session nicht gefunden." };
  if (!canMembersJoinSession(session as LiveSessionRow)) {
    return { ok: false as const, error: "Session ist nicht geöffnet." };
  }
  return { ok: true as const, user, supabase, session: session as LiveSessionRow };
}

export async function sendLiveSessionMessage(
  sessionId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireJoinableSession(sessionId);
  if (!gate.ok) return gate;

  const text = body.trim().slice(0, LIVE_SESSION_CHAT_MAX_LEN);
  if (!text) return { ok: false, error: "Nachricht leer." };

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
  const gate = await requireJoinableSession(sessionId);
  if (!gate.ok) return gate;

  const text = body.trim().slice(0, LIVE_SESSION_QUESTION_MAX_LEN);
  if (!text) return { ok: false, error: "Frage leer." };

  const { error } = await gate.supabase.from("live_session_questions").insert({
    session_id: sessionId,
    author_id: gate.user.id,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
