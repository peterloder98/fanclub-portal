"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sendLiveSessionMessage } from "@/app/(app)/live/actions";
import { LIVE_SESSION_CHAT_COOLDOWN_MS, LIVE_SESSION_CHAT_MAX_LEN } from "@/lib/live/types";
import { profileDisplayName } from "@/lib/profiles/display";

export type LiveChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export function useLiveSessionChat(sessionId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const authorsRef = useRef<Map<string, string>>(new Map());

  const loadAuthors = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !authorsRef.current.has(id));
    if (!missing.length) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email")
      .in("id", missing);
    for (const p of data ?? []) {
      authorsRef.current.set(
        p.id,
        profileDisplayName({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
        }),
      );
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      const { data } = await supabase
        .from("live_session_messages")
        .select("id,body,created_at,author_id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(150);

      const rows = data ?? [];
      await loadAuthors(rows.map((r) => r.author_id));
      if (cancelled) return;
      setMessages(
        rows.map((r) => ({
          id: r.id,
          body: r.body,
          createdAt: r.created_at,
          authorId: r.author_id,
          authorName: authorsRef.current.get(r.author_id) ?? "Mitglied",
        })),
      );
      setLoaded(true);
    })();

    const channel = supabase
      .channel(`live-session-chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            author_id: string;
          };
          void (async () => {
            await loadAuthors([row.author_id]);
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  id: row.id,
                  body: row.body,
                  createdAt: row.created_at,
                  authorId: row.author_id,
                  authorName: authorsRef.current.get(row.author_id) ?? "Mitglied",
                },
              ];
            });
          })();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, enabled, loadAuthors]);

  async function send() {
    if (!sessionId || !draft.trim() || sending) return;
    if (Date.now() < cooldownUntil) return;
    setSending(true);
    setError(null);
    const text = draft.trim().slice(0, LIVE_SESSION_CHAT_MAX_LEN);
    const result = await sendLiveSessionMessage(sessionId, text);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft("");
    setCooldownUntil(Date.now() + LIVE_SESSION_CHAT_COOLDOWN_MS);
  }

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

  return {
    messages,
    draft,
    setDraft,
    send,
    sending,
    error,
    userId,
    loaded,
    cooldownLeft,
    maxLen: LIVE_SESSION_CHAT_MAX_LEN,
  };
}
