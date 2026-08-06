"use client";

import { useLiveSessionChat } from "@/lib/live/use-live-session-chat";
import { cn } from "@/lib/cn";

export function LiveSessionChatPanel({
  sessionId,
  enabled,
  className,
}: {
  sessionId: string;
  enabled: boolean;
  className?: string;
}) {
  const chat = useLiveSessionChat(sessionId, enabled);

  return (
    <div className={cn("flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-fc-navy">Live-Chat</h2>
        <p className="text-xs text-slate-500">Nur für diese Session</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {!chat.loaded ? (
          <p className="text-sm text-slate-500">Lade…</p>
        ) : chat.messages.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Nachrichten.</p>
        ) : (
          chat.messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm",
                m.authorId === chat.userId ? "bg-fc-ice text-fc-navy" : "bg-slate-50 text-slate-800",
              )}
            >
              <p className="text-xs font-semibold text-slate-500">{m.authorName}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-slate-100 p-3">
        {chat.error ? <p className="mb-2 text-xs text-rose-700">{chat.error}</p> : null}
        <div className="flex gap-2">
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
            className="h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)] disabled:opacity-60"
          />
          <button
            type="button"
            disabled={!enabled || chat.sending || !chat.draft.trim() || chat.cooldownLeft > 0}
            onClick={() => void chat.send()}
            className="h-10 shrink-0 rounded-xl bg-fc-navy px-3 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
          >
            {chat.cooldownLeft > 0 ? `${chat.cooldownLeft}s` : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
