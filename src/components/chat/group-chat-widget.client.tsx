"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useGroupChat } from "@/lib/chat/use-group-chat";
import { GroupChatPanel } from "@/components/chat/group-chat-panel.client";

const STORAGE_KEY = "fc-group-chat-open";

export function GroupChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideDock = pathname === "/chat" || Boolean(pathname?.startsWith("/chat/"));

  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const chat = useGroupChat({ enabled: !hideDock });

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(STORAGE_KEY) === "1");
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

  if (hideDock) return null;

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-[60] transition-[padding] duration-200",
          open ? "pb-[min(28rem,70vh)]" : "pb-16",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "fixed bottom-3 right-3 z-[70] flex flex-col items-end gap-2",
          "max-sm:left-3 max-sm:right-3 max-sm:items-stretch",
        )}
      >
        {open ? (
          <div className="pointer-events-auto h-[min(28rem,70vh)] w-full max-w-md max-sm:max-w-none">
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
              onCollapse={() => setOpen(false)}
            />
          </div>
        ) : null}

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "pointer-events-auto inline-flex items-center gap-2 rounded-2xl border-2 border-fc-blue bg-white px-3 py-2.5",
              "text-sm font-semibold text-fc-navy shadow-lg shadow-fc-navy/20",
              "transition hover:border-fc-navy hover:bg-fc-ice",
              "max-sm:w-full max-sm:justify-center",
            )}
            aria-expanded={false}
            aria-label="Gruppenchat öffnen"
          >
            <MessageCircle className="h-4 w-4 text-fc-blue" />
            <span>Gruppenchat</span>
            {chat.onlineCount > 0 ? (
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
