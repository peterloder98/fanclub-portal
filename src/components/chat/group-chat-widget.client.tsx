"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useGroupChat } from "@/lib/chat/use-group-chat";
import {
  markChatSeenFromMessages,
  readChatLastSeen,
  writeChatLastSeen,
} from "@/lib/chat/last-seen";
import { GroupChatPanel } from "@/components/chat/group-chat-panel.client";
import { useChatUnread } from "@/components/chat/chat-unread-context";

const STORAGE_KEY = "fc-group-chat-open";

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
      setLastSeenAt(readChatLastSeen());
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

  useEffect(() => {
    if (hideDock) return;
    setLastSeenAt(readChatLastSeen());
  }, [hideDock]);

  useEffect(() => {
    if (!hydrated || !chat.loaded || seenBootstrapped || hideDock) return;
    if (lastSeenAt == null) {
      const newest = chat.messages[0]?.created_at ?? new Date().toISOString();
      writeChatLastSeen(newest);
      setLastSeenAt(newest);
    }
    setSeenBootstrapped(true);
  }, [hydrated, chat.loaded, chat.messages, lastSeenAt, seenBootstrapped, hideDock]);

  useEffect(() => {
    if (!open || !chat.messages.length) return;
    const newest = markChatSeenFromMessages(chat.messages);
    if (!lastSeenAt || newest > lastSeenAt) setLastSeenAt(newest);
  }, [open, chat.messages, lastSeenAt]);

  const { setHasUnread } = useChatUnread();

  useEffect(() => {
    if (hideDock) {
      document.documentElement.style.setProperty("--fanclub-chat-dock", "0px");
      return;
    }
    const value = open
      ? "min(28rem, 70vh)"
      : "calc(4.75rem + env(safe-area-inset-bottom, 0px))";
    // Desktop only — mobile uses the tab bar for bottom chrome.
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      document.documentElement.style.setProperty(
        "--fanclub-chat-dock",
        mq.matches ? value : "0px",
      );
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.setProperty("--fanclub-chat-dock", "0px");
    };
  }, [open, hideDock]);

  const hasUnread = useMemo(() => {
    if (hideDock || open || !lastSeenAt || !chat.userId) return false;
    return chat.messages.some(
      (m) => m.author_id !== chat.userId && m.created_at > lastSeenAt,
    );
  }, [hideDock, open, lastSeenAt, chat.messages, chat.userId]);

  useEffect(() => {
    setHasUnread(hasUnread);
  }, [hasUnread, setHasUnread]);

  return (
    <>
      {hideDock ? null : (
        <div className="pointer-events-none fixed bottom-3 right-3 z-[1100] hidden flex-col items-end gap-2 lg:flex">
          {open ? (
            <div className="pointer-events-auto h-[min(28rem,70vh)] w-[min(calc(100vw-1.5rem),28rem)]">
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
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "pointer-events-auto relative inline-flex items-center gap-2 rounded-2xl border-2 bg-white px-3 py-2.5",
                "text-sm font-semibold text-fc-navy shadow-lg shadow-fc-navy/20",
                "transition hover:border-fc-navy hover:bg-fc-ice",
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
          )}
        </div>
      )}
    </>
  );
}
