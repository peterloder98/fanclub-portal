"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, MessageCircle, SendHorizontal, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { mentionTextToPlain } from "@/lib/mentions/format";
import { cn } from "@/lib/cn";
import { MentionInput } from "@/components/feed/mention-input";
import { MentionText } from "@/components/feed/mention-text";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  deleteGroupChatMessage,
  sendGroupChatMessage,
} from "@/app/(app)/chat/actions";
import {
  GROUP_CHAT_COOLDOWN_MS,
  GROUP_CHAT_MAX_LEN,
  type GroupChatMessageRow,
} from "@/lib/chat/constants";

const STORAGE_KEY = "fanclub.groupChat.expanded";
const PAGE_SIZE = 80;
const PRESENCE_CHANNEL = "fanclub-online";

type ChatAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type ChatMessage = GroupChatMessageRow & {
  author: ChatAuthor;
};

function displayName(p: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
  return p.first_name || p.last_name || "Mitglied";
}

function truncate(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function GroupChatWidget() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const authorsRef = useRef<Map<string, ChatAuthor>>(new Map());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const cooldownLeftMs = Math.max(0, cooldownUntil - nowTick);
  const cooldownActive = cooldownLeftMs > 0;
  const overLimit = draft.length > GROUP_CHAT_MAX_LEN;

  useEffect(() => {
    try {
      setExpanded(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("chat") !== "1") return;
    setExpanded(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("chat");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (!cooldownActive) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooldownActive]);

  const loadAuthors = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !authorsRef.current.has(id));
    if (!missing.length) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,avatar_path,updated_at")
      .in("id", missing);
    for (const p of data ?? []) {
      authorsRef.current.set(p.id, {
        id: p.id,
        name: displayName(p),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      });
    }
  }, []);

  const hydrate = useCallback(
    async (rows: GroupChatMessageRow[]): Promise<ChatMessage[]> => {
      await loadAuthors(rows.map((r) => r.author_id));
      return rows.map((r) => ({
        ...r,
        author: authorsRef.current.get(r.author_id) ?? {
          id: r.author_id,
          name: "Mitglied",
          avatarUrl: null,
        },
      }));
    },
    [loadAuthors],
  );

  const refresh = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setLoaded(true);
      return;
    }
    setUserId(user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    setIsAdmin(profile?.role === "admin");

    const { data, error: loadError } = await supabase
      .from("group_chat_messages")
      .select("id,author_id,body,created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (loadError) {
      setError(
        /relation|does not exist|group_chat/i.test(loadError.message)
          ? "Chat-Tabelle fehlt — bitte SQL 095 ausführen."
          : loadError.message,
      );
      setLoaded(true);
      return;
    }

    const { data: lastOwn } = await supabase
      .from("group_chat_messages")
      .select("created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastOwn?.created_at) {
      const until = new Date(lastOwn.created_at).getTime() + GROUP_CHAT_COOLDOWN_MS;
      if (until > Date.now()) {
        setCooldownUntil(until);
        setNowTick(Date.now());
      }
    }

    setMessages(await hydrate((data ?? []) as GroupChatMessageRow[]));
    setLoaded(true);
  }, [hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const messagesChannel = supabase
      .channel("group-chat-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_messages" },
        () => void refresh(),
      )
      .subscribe();

    const presenceChannel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    const syncPresence = () => {
      const state = presenceChannel.presenceState();
      setOnlineCount(Math.max(1, Object.keys(state).length));
    };

    presenceChannel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(presenceChannel);
    };
  }, [userId, refresh]);

  const latest = messages[0] ?? null;

  const preview = useMemo(() => {
    if (!latest) return { name: "Gruppenchat", body: "Noch keine Nachrichten" };
    return {
      name: latest.author.name,
      body: truncate(mentionTextToPlain(latest.body), 42),
    };
  }, [latest]);

  const onlineLabel =
    onlineCount === 1
      ? "1 Mitglied online"
      : `${onlineCount} Mitglieder online`;

  function toggleExpanded(next: boolean) {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function onDraftChange(next: string) {
    setDraft(next);
    if (next.length > GROUP_CHAT_MAX_LEN) {
      setError(
        `Zeichenlimit überschritten. Maximal ${GROUP_CHAT_MAX_LEN} Zeichen erlaubt.`,
      );
    } else {
      setError((prev) =>
        prev?.includes("Zeichenlimit") || prev?.includes("kurz warten") ? null : prev,
      );
    }
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || sending || cooldownActive) {
      if (cooldownActive && text) {
        setError("Bitte kurz warten, bevor du erneut schreibst.");
      }
      return;
    }
    if (draft.length > GROUP_CHAT_MAX_LEN) {
      setError(
        `Zeichenlimit überschritten. Maximal ${GROUP_CHAT_MAX_LEN} Zeichen erlaubt.`,
      );
      return;
    }
    setSending(true);
    setError(null);
    const result = await sendGroupChatMessage(text);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.retryAfterMs) {
        setCooldownUntil(Date.now() + result.retryAfterMs);
        setNowTick(Date.now());
      }
      return;
    }
    setDraft("");
    setCooldownUntil(Date.now() + GROUP_CHAT_COOLDOWN_MS);
    setNowTick(Date.now());
    setMessages((prev) => {
      const without = prev.filter((m) => m.id !== result.message.id);
      const author =
        authorsRef.current.get(result.message.author_id) ??
        ({
          id: result.message.author_id,
          name: "Du",
          avatarUrl: null,
        } satisfies ChatAuthor);
      return [{ ...result.message, author }, ...without].slice(0, PAGE_SIZE);
    });
    void loadAuthors([result.message.author_id]).then(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === result.message.id
            ? {
                ...m,
                author: authorsRef.current.get(m.author_id) ?? m.author,
              }
            : m,
        ),
      );
    });
  }

  async function onDelete(id: string) {
    const prev = messages;
    setMessages((m) => m.filter((x) => x.id !== id));
    const result = await deleteGroupChatMessage(id);
    if (!result.ok) {
      setMessages(prev);
      setError(result.error);
    }
  }

  if (!userId && loaded) return null;
  if (!loaded && !userId) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[180] flex flex-col items-end gap-2",
        "right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
        "sm:right-4 sm:bottom-4",
      )}
    >
      {expanded ? (
        <div
          className={cn(
            "pointer-events-auto flex w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden",
            "rounded-2xl border border-fc-navy/20 bg-white shadow-2xl shadow-fc-navy/25",
            "h-[min(26rem,55dvh)]",
          )}
          role="dialog"
          aria-label="Gruppenchat"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2.5 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Gruppenchat</p>
              <p className="truncate text-[11px] text-white/80">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 align-middle" />
                {onlineLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleExpanded(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Chat verkleinern"
              title="Verkleinern"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!messages.length ? (
              <div className="grid h-full place-items-center px-4 text-center">
                <div>
                  <MessageCircle className="mx-auto mb-2 h-8 w-8 text-fc-sky/80" />
                  <p className="text-sm font-medium text-fc-navy">Noch still hier</p>
                  <p className="mt-1 text-xs text-slate-500">Schreib die erste Nachricht an alle.</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-fc-navy/5">
                {messages.map((m, i) => {
                  const canDelete = isAdmin || m.author_id === userId;
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        "px-3 py-2.5",
                        i % 2 === 0 ? "bg-white" : "bg-fc-ice/70",
                      )}
                    >
                      <div className="flex gap-2.5">
                        <UserAvatar name={m.author.name} avatarUrl={m.author.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-fc-navy">
                              {m.author.name}
                              {m.author_id === userId ? (
                                <span className="ml-1 font-normal text-slate-400">(du)</span>
                              ) : null}
                            </p>
                            <time
                              className="shrink-0 text-[10px] tabular-nums text-slate-400"
                              dateTime={m.created_at}
                            >
                              {formatTime(m.created_at)}
                            </time>
                            {canDelete ? (
                              <button
                                type="button"
                                onClick={() => void onDelete(m.id)}
                                className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Nachricht löschen"
                                title="Löschen"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="inline-block w-5 shrink-0" aria-hidden />
                            )}
                          </div>
                          <MentionText
                            text={m.body}
                            className="mt-0.5 block text-[13px] leading-snug text-slate-700"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="shrink-0 border-t border-fc-navy/10 bg-fc-mist/80 p-2.5">
            {error ? (
              <p className="mb-1.5 text-[11px] text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-end gap-1.5">
              <MentionInput
                value={draft}
                onChange={onDraftChange}
                multiline
                rows={2}
                disabled={sending}
                placeholder="Nachricht… @ für Markierung"
                className="min-w-0 flex-1"
                inputClassName={cn(
                  "w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm text-fc-navy outline-none placeholder:text-slate-400 focus:ring-2",
                  overLimit
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                    : "border-fc-navy/15 focus:border-fc-blue focus:ring-fc-sky/30",
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void onSend()}
                disabled={sending || cooldownActive || !draft.trim() || overLimit}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy text-white transition hover:bg-fc-blue disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Senden"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => toggleExpanded(true)}
          className={cn(
            "pointer-events-auto flex w-[min(18rem,calc(100vw-1.5rem))] items-center gap-2.5",
            "rounded-2xl border-2 border-fc-navy/35 bg-gradient-to-r from-white via-white to-fc-ice",
            "px-3 py-2.5 text-left shadow-[0_10px_28px_rgba(20,49,101,0.28)]",
            "ring-1 ring-fc-navy/10 transition hover:border-fc-blue hover:shadow-[0_12px_32px_rgba(20,49,101,0.35)]",
          )}
          aria-label="Gruppenchat öffnen"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-blue text-white shadow-sm shadow-fc-navy/30">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-fc-navy">{preview.name}</span>
            <span className="block truncate text-[11px] text-slate-600">{preview.body}</span>
          </span>
        </button>
      )}
    </div>
  );
}
