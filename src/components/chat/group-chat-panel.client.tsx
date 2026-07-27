"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Maximize2, MessageCircle, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MentionInput } from "@/components/feed/mention-input";
import { MentionText } from "@/components/feed/mention-text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatChatTime, type OnlineMember } from "@/lib/chat/types";
import type { ChatMessage } from "@/lib/chat/use-group-chat";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function OnlineMembersControl({
  onlineCount,
  onlineMembers,
  variant = "light",
}: {
  onlineCount: number;
  onlineMembers: OnlineMember[];
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const label =
    onlineCount === 1 ? "1 Mitglied online" : `${onlineCount} Mitglieder online`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 truncate text-left text-[11px]",
          variant === "dark" ? "text-white/85 hover:text-white" : "text-slate-600 hover:text-fc-navy",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
            variant === "dark" ? "bg-emerald-300" : "bg-emerald-500",
          )}
        />
        <span className="truncate underline-offset-2 hover:underline">{label}</span>
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border bg-white py-1 shadow-xl shadow-slate-900/15"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          role="listbox"
        >
          <p className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Gerade online
          </p>
          <ul className="max-h-56 overflow-y-auto">
            {onlineMembers.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/mitglieder?focus=${m.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-fc-ice"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs" />
                  <span className="min-w-0 truncate font-medium text-fc-navy">{m.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChatWarnButton({
  messageId,
  onRemoved,
}: {
  messageId: string;
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        const ok = window.confirm(
          "Nachricht löschen und automatische Verwarnung per E-Mail senden?",
        );
        if (!ok) return;
        onRemoved();
        startTransition(async () => {
          try {
            const result = await issueCommentWarning({
              commentType: "chat",
              commentId: messageId,
            });
            router.refresh();
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
            router.refresh();
          }
        });
      }}
      className="grid h-5 w-5 shrink-0 place-items-center rounded text-amber-600 transition hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50"
      aria-label="Verwarnung aussprechen"
      title="Verwarnung"
    >
      <AlertTriangle className="h-3.5 w-3.5" />
    </button>
  );
}

type PanelProps = {
  mode: "dock" | "fullscreen";
  messages: ChatMessage[];
  draft: string;
  sending: boolean;
  error: string | null;
  userId: string | null;
  isAdmin: boolean;
  onlineCount: number;
  onlineMembers: OnlineMember[];
  cooldownActive: boolean;
  overLimit: boolean;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onDelete: (id: string) => void;
  onRemoveLocal?: (id: string) => void;
  onCollapse?: () => void;
  className?: string;
};

export function GroupChatPanel({
  mode,
  messages,
  draft,
  sending,
  error,
  userId,
  isAdmin,
  onlineCount,
  onlineMembers,
  cooldownActive,
  overLimit,
  onDraftChange,
  onSend,
  onDelete,
  onRemoveLocal,
  onCollapse,
  className,
}: PanelProps) {
  const fullscreen = mode === "fullscreen";
  const [composerFocused, setComposerFocused] = useState(false);
  const composerRows = composerFocused || draft.includes("\n") ? 3 : 1;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-white",
        fullscreen
          ? "min-h-0 flex-1 rounded-2xl border border-fc-navy/15 shadow-sm"
          : "h-full rounded-2xl border border-fc-navy/20 shadow-2xl shadow-fc-navy/25",
        className,
      )}
      role={fullscreen ? undefined : "dialog"}
      aria-label="Gruppenchat"
    >
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between gap-2 border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2.5 text-white",
          !fullscreen && onCollapse && "cursor-pointer",
        )}
      >
        {!fullscreen && onCollapse ? (
          <button
            type="button"
            className="absolute inset-0 z-0"
            aria-label="Chat verkleinern"
            onClick={() => onCollapse()}
          />
        ) : null}
        <div
          className={cn(
            "relative z-10 min-w-0 flex-1",
            !fullscreen && onCollapse && "pointer-events-none",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-semibold tracking-tight">Gruppenchat</p>
            {!fullscreen ? (
              <Link
                href="/chat"
                className="pointer-events-auto inline-flex items-center gap-1 text-[11px] font-medium text-white/85 underline-offset-2 hover:text-white hover:underline"
              >
                <Maximize2 className="h-3 w-3" />
                Chat in Vollbild öffnen
              </Link>
            ) : null}
          </div>
          <div className="pointer-events-auto mt-0.5">
            <OnlineMembersControl
              onlineCount={onlineCount}
              onlineMembers={onlineMembers}
              variant="dark"
            />
          </div>
        </div>
        {!fullscreen && onCollapse ? (
          <button
            type="button"
            onClick={() => onCollapse()}
            className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
            aria-label="Chat verkleinern"
            title="Verkleinern"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          fullscreen && "max-h-none",
        )}
      >
        {!messages.length ? (
          <div className="grid h-full min-h-[12rem] place-items-center px-4 text-center">
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
              const canWarn = Boolean(isAdmin && m.author_id !== userId);
              return (
                <li
                  key={m.id}
                  className={cn(
                    fullscreen ? "px-3 py-2.5 sm:px-4 sm:py-3" : "px-3 py-2.5",
                    i % 2 === 0 ? "bg-white" : "bg-fc-ice/70",
                  )}
                >
                  <div className="min-w-0 w-full">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar
                        name={m.author.name}
                        avatarUrl={m.author.avatarUrl}
                        size="xs"
                        className="shrink-0 sm:hidden"
                      />
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
                        {formatChatTime(m.created_at)}
                      </time>
                      {canWarn ? (
                        <ChatWarnButton
                          messageId={m.id}
                          onRemoved={() => (onRemoveLocal ?? onDelete)(m.id)}
                        />
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDelete(m.id);
                          }}
                          className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Nachricht löschen"
                          title="Löschen"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <MentionText
                      text={m.body}
                      className="mt-0.5 block w-full min-w-0 text-[13px] leading-snug text-slate-700"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer
        className={cn(
          "shrink-0 border-t border-fc-navy/10 bg-fc-mist/80",
          fullscreen ? "p-3" : "p-2.5",
        )}
      >
        {error && !/warten|cooldown|zu schnell/i.test(error) ? (
          <p className="mb-1.5 text-[11px] text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-1.5">
          <MentionInput
            value={draft}
            onChange={onDraftChange}
            multiline
            rows={composerRows}
            disabled={sending}
            placeholder="Nachricht… @ für Markierung"
            className="min-w-0 flex-1"
            inputClassName={cn(
              "w-full min-w-0 max-w-full overflow-x-hidden resize-none rounded-xl border bg-white px-3 text-sm text-fc-navy outline-none placeholder:text-slate-400 focus:ring-2 transition-[min-height] duration-150",
              composerRows === 1 ? "py-2" : "py-2",
              overLimit
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-fc-navy/15 focus:border-fc-blue focus:ring-fc-sky/30",
            )}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
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
  );
}
