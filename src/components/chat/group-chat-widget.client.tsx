"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useGroupChat } from "@/lib/chat/use-group-chat";
import { GroupChatPanel } from "@/components/chat/group-chat-panel.client";

const STORAGE_KEY = "fc-group-chat-open";
const SEEN_KEY = "fc-group-chat-last-seen";

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(iso: string) {
  try {
    localStorage.setItem(SEEN_KEY, iso);
  } catch {
    /* ignore */
  }
}

export function GroupChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideDock = pathname === "/chat" || Boolean(pathname?.startsWith("/chat/"));

  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [seenBootstrapped, setSeenBootstrapped] = useState(false);

  const chat = useGroupChat({ enabled: !hideDock });

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(STORAGE_KEY) === "1");
      setLastSeenAt(readLastSeen());
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, hydrated]);

  useEffect(() => {
    if (searchParams.get("chat") === "1" && !hideDock) {
      setOpen(true);
      const next = new URLSearchParams(searchParams.toString());
      next.delete("chat");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [searchParams, hideDock, pathname, router]);

  useEffect(() => {
    if (!open || hideDock) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hideDock]);

  // Erster Besuch: Historie nicht als ungelesen zählen — ab jetzt neue Messages tracken.
  useEffect(() => {
    if (!hydrated || !chat.loaded || seenBootstrapped) return;
    if (lastSeenAt == null) {
      const newest = chat.messages[0]?.created_at ?? new Date().toISOString();
      writeLastSeen(newest);
      setLastSeenAt(newest);
    }
    setSeenBootstrapped(true);
  }, [hydrated, chat.loaded, chat.messages, lastSeenAt, seenBootstrapped]);

  // Chat offen → alles als gelesen markieren.
  useEffect(() => {
    if (!open || !chat.messages.length) return;
    const newest = chat.messages.reduce(
      (max, m) => (m.created_at > max ? m.created_at : max),
      chat.messages[0].created_at,
    );
    if (!lastSeenAt || newest > lastSeenAt) {
      writeLastSeen(newest);
      setLastSeenAt(newest);
    }
  }, [open, chat.messages, lastSeenAt]);

  const unread = useMemo(() => {
    if (open || !lastSeenAt || !chat.userId) return [];
    return chat.messages.filter(
      (m) => m.author_id !== chat.userId && m.created_at > lastSeenAt,
    );
  }, [open, lastSeenAt, chat.messages, chat.userId]);

  const unreadCount = unread.length;
  const hasUnread = unreadCount > 0;

  if (hideDock) return null;

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[1100] transition-[padding] duration-200",
          open ? "pb-[min(28rem,70vh)]" : "pb-16",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "fixed bottom-3 right-3 z-[1100] flex flex-col items-end gap-2",
          "max-sm:left-3 max-sm:right-3 max-sm:items-stretch",
        )}
      >
        {open ? (
          <div className="pointer-events-auto h-[min(28rem,70vh)] w-[min(calc(100vw-1.5rem),28rem)] max-sm:w-full">
            <GroupChatPanel
              mode="dock"
              messages={chat.messages}
              draft={chat.draft}
              sending={chat.sending}
              error={chat.error}
              userId={chat.userId}
              isAdmin={chat.isAdmin}
              onlineCount={chat.onlineCount}
              onlineMembers={chat.onlineMembers}
              cooldownActive={chat.cooldownActive}
              overLimit={chat.overLimit}
              onDraftChange={chat.onDraftChange}
              onSend={chat.onSend}
              onDelete={chat.onDelete}
              onRemoveLocal={chat.onRemoveLocal}
              onCollapse={() => setOpen(false)}
            />
          </div>
        ) : null}

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "pointer-events-auto relative inline-flex items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2.5",
              "text-sm font-semibold text-fc-navy shadow-lg shadow-fc-navy/20",
              "transition hover:border-fc-navy hover:bg-fc-ice",
              "max-sm:w-full max-sm:justify-center",
              hasUnread ? "border-fc-blue ring-2 ring-fc-sky/70" : "border-fc-blue",
            )}
            aria-expanded={false}
            aria-label={hasUnread ? "Gruppenchat öffnen, neue Nachrichten" : "Gruppenchat öffnen"}
          >
            <span className="relative">
              <MessageCircle className="h-4 w-4 text-fc-blue" />
              {hasUnread ? (
                <span
                  className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 ring-2 ring-white"
                  aria-hidden
                />
              ) : null}
            </span>
            <span>Gruppenchat</span>
            {hasUnread ? (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                Neu
              </span>
            ) : chat.onlineCount > 0 ? (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                {chat.onlineCount} online
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </>
  );
}
