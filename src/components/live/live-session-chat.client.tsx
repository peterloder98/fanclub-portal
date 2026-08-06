"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MessageCircle, SendHorizontal, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteLiveSessionMessage,
  sendLiveSessionMessage,
} from "@/app/(app)/live/actions";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { LIVE_SESSION_CHAT_COOLDOWN_MS, LIVE_SESSION_CHAT_MAX_LEN } from "@/lib/live/types";
import { profileDisplayName } from "@/lib/profiles/display";
import { formatChatTime } from "@/lib/chat/types";
import { cn } from "@/lib/cn";

export type LiveChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

function LiveChatWarnButton({
  messageId,
  onRemoved,
}: {
  messageId: string;
  onRemoved: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        const warnOk = window.confirm(
          "Verwarnung aussprechen und automatische E-Mail an das Mitglied senden?",
        );
        if (!warnOk) return;
        const deleteOk = window.confirm(
          "Nachricht zusätzlich löschen?\n\nOK = löschen + verwarnen\nAbbrechen = nur verwarnen (bleibt stehen)",
        );
        if (deleteOk) onRemoved();
        setPending(true);
        void (async () => {
          try {
            const result = await issueCommentWarning({
              commentType: "live_chat",
              commentId: messageId,
              deleteComment: deleteOk,
            });
            if (result.isThirdWarning) {
              window.alert(
                "Hinweis: Dies ist bereits die 3. Verwarnung für dieses Mitglied. Evtl. sind weitere Schritte nötig.",
              );
            }
          } catch (err) {
            window.alert(
              err instanceof Error
                ? err.message
                : "Verwarnung fehlgeschlagen — bitte Seite neu laden.",
            );
          } finally {
            setPending(false);
          }
        })();
      }}
      className="grid h-5 w-5 shrink-0 place-items-center rounded text-amber-600 transition hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
      aria-label="Verwarnung aussprechen"
      title="Verwarnung"
    >
      <AlertTriangle className="h-3.5 w-3.5" />
    </button>
  );
}

export function useLiveSessionChat(sessionId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [nowTick, setNowTick] = useState(0);
  const authorsRef = useRef<Map<string, string>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

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
    if (!cooldownUntil) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

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
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setIsAdmin(profile?.role === "admin");
      }

      const { data } = await supabase
        .from("live_session_messages")
        .select("id,body,created_at,author_id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(200);

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
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
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
            requestAnimationFrame(() => {
              const el = listRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            });
          })();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "live_session_messages",
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
          }
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

  async function remove(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const result = await deleteLiveSessionMessage(id);
    if (!result.ok) setError(result.error);
  }

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  void nowTick;

  return {
    messages,
    draft,
    setDraft,
    send,
    remove,
    sending,
    error,
    userId,
    isAdmin,
    loaded,
    cooldownLeft,
    maxLen: LIVE_SESSION_CHAT_MAX_LEN,
    listRef,
  };
}

export function LiveSessionChatPanel({
  sessionId,
  enabled,
  className,
  readOnly = false,
}: {
  sessionId: string;
  enabled: boolean;
  className?: string;
  /** Host: nur mitlesen */
  readOnly?: boolean;
}) {
  const chat = useLiveSessionChat(sessionId, enabled && !readOnly);
  // readOnly host uses polling feed instead — this panel is for members

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-fc-navy/15 bg-white shadow-sm",
        className,
      )}
    >
      <header className="shrink-0 border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2.5 text-white">
        <p className="text-sm font-semibold tracking-tight">Live-Chat</p>
        <p className="text-[11px] text-white/80">Nur für diese Session</p>
      </header>

      <div
        ref={chat.listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {!chat.loaded ? (
          <p className="p-4 text-sm text-slate-500">Lade…</p>
        ) : chat.messages.length === 0 ? (
          <div className="grid h-full min-h-[10rem] place-items-center px-4 text-center">
            <div>
              <MessageCircle className="mx-auto mb-2 h-7 w-7 text-fc-sky/80" />
              <p className="text-sm font-medium text-fc-navy">Noch still hier</p>
              <p className="mt-1 text-xs text-slate-500">Schreib die erste Nachricht.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-fc-navy/5">
            {chat.messages.map((m, i) => {
              const canDelete = chat.isAdmin || m.authorId === chat.userId;
              const canWarn = Boolean(chat.isAdmin && m.authorId !== chat.userId);
              return (
                <li
                  key={m.id}
                  className={cn("px-3 py-2.5", i % 2 === 0 ? "bg-white" : "bg-fc-ice/70")}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-fc-navy">
                      <Link
                        href={`/mitglieder/${m.authorId}`}
                        className="hover:text-fc-blue hover:underline"
                      >
                        {m.authorName}
                      </Link>
                      {m.authorId === chat.userId ? (
                        <span className="ml-1 font-normal text-slate-400">(du)</span>
                      ) : null}
                    </p>
                    <time
                      className="shrink-0 text-[10px] tabular-nums text-slate-400"
                      dateTime={m.createdAt}
                    >
                      {formatChatTime(m.createdAt)}
                    </time>
                    {canWarn ? (
                      <LiveChatWarnButton
                        messageId={m.id}
                        onRemoved={() => void chat.remove(m.id)}
                      />
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => void chat.remove(m.id)}
                        className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Nachricht löschen"
                        title="Löschen"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-snug text-slate-700">
                    {m.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!readOnly ? (
        <footer className="shrink-0 border-t border-fc-navy/10 bg-fc-mist/80 p-2.5">
          {chat.error ? (
            <p className="mb-1.5 text-[11px] text-rose-600" role="alert">
              {chat.error}
            </p>
          ) : null}
          <div className="flex items-center gap-1.5">
            <input
              value={chat.draft}
              onChange={(e) => chat.setDraft(e.target.value.slice(0, chat.maxLen))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void chat.send();
                }
              }}
              disabled={!enabled}
              placeholder="Nachricht…"
              className="h-10 min-w-0 flex-1 rounded-xl border border-fc-navy/15 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)] disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!enabled || chat.sending || !chat.draft.trim() || chat.cooldownLeft > 0}
              onClick={() => void chat.send()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy text-white hover:bg-fc-blue disabled:opacity-60"
              aria-label="Senden"
            >
              {chat.cooldownLeft > 0 ? (
                <span className="text-[10px] font-semibold tabular-nums">{chat.cooldownLeft}</span>
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
