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
  const authorsRef = useRef<Map<string, ChatAuthor>>(new Map());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const cooldownLeftMs = Math.max(0, cooldownUntil - nowTick);
  const cooldownActive = cooldownLeftMs > 0;
  const cooldownSecs = Math.ceil(cooldownLeftMs / 1000);

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
    setError(null);
    setLoaded(true);
  }, [hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("group-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_messages" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
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

  function toggleExpanded(next: boolean) {
    setExpanded(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || sending || cooldownActive) return;
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
    if (!isAdmin) return;
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
            "rounded-2xl border border-fc-navy/15 bg-white shadow-xl shadow-fc-navy/15",
            "h-[min(26rem,55dvh)]",
          )}
          role="dialog"
          aria-label="Gruppenchat"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2.5 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Gruppenchat</p>
              <p className="truncate text-[11px] text-white/75">Alle Mitglieder · neueste oben</p>
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
                {messages.map((m, i) => (
                  <li
                    key={m.id}
                    className={cn(
                      "group relative px-3 py-2.5",
                      i % 2 === 0 ? "bg-white" : "bg-fc-ice/70",
                    )}
                  >
                    <div className="flex gap-2.5">
                      <UserAvatar name={m.author.name} avatarUrl={m.author.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-fc-navy">
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
                        </div>
                        <MentionText
                          text={m.body}
                          className="mt-0.5 block text-[13px] leading-snug text-slate-700"
                        />
                      </div>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => void onDelete(m.id)}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-slate-400 opacity-70 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Nachricht löschen"
                          title="Löschen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
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
                onChange={setDraft}
                multiline
                rows={2}
                disabled={sending}
                placeholder="Nachricht… @ für Markierung"
                className="min-w-0 flex-1"
                inputClassName="w-full resize-none rounded-xl border border-fc-navy/15 bg-white px-3 py-2 text-sm text-fc-navy outline-none placeholder:text-slate-400 focus:border-fc-blue focus:ring-2 focus:ring-fc-sky/30"
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
                disabled={sending || cooldownActive || !draft.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy text-white transition hover:bg-fc-blue disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Senden"
                title={cooldownActive ? `Noch ${cooldownSecs}s` : "Senden"}
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">
              {cooldownActive
                ? `Nächste Nachricht in ${cooldownSecs}s`
                : `Max. alle 10 Sekunden · ${draft.length}/${GROUP_CHAT_MAX_LEN}`}
            </p>
          </footer>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => toggleExpanded(true)}
          className={cn(
            "pointer-events-auto flex w-[min(18rem,calc(100vw-1.5rem))] items-center gap-2.5",
            "rounded-2xl border border-fc-navy/15 bg-white/95 px-3 py-2.5 text-left",
            "shadow-lg shadow-fc-navy/12 backdrop-blur-sm transition hover:border-fc-blue/40 hover:shadow-xl",
          )}
          aria-label="Gruppenchat öffnen"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-blue text-white">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-fc-navy">{preview.name}</span>
            <span className="block truncate text-[11px] text-slate-500">{preview.body}</span>
          </span>
        </button>
      )}
    </div>
  );
}
