"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Maximize2, MessageCircle, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MentionInput } from "@/components/feed/mention-input";
import { MentionText } from "@/components/feed/mention-text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatChatTime, type OnlineMember } from "@/lib/chat/types";
import { GROUP_CHAT_MAX_LEN } from "@/lib/chat/constants";
import type { ChatMessage } from "@/lib/chat/use-group-chat";

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
  onCollapse,
  className,
}: PanelProps) {
  const fullscreen = mode === "fullscreen";

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
          "flex shrink-0 items-center justify-between gap-2 border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-3 py-2.5 text-white",
          !fullscreen && onCollapse && "cursor-pointer",
        )}
        onClick={!fullscreen && onCollapse ? () => onCollapse() : undefined}
        onKeyDown={
          !fullscreen && onCollapse
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCollapse();
                }
              }
            : undefined
        }
        role={!fullscreen && onCollapse ? "button" : undefined}
        tabIndex={!fullscreen && onCollapse ? 0 : undefined}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-semibold tracking-tight">Gruppenchat</p>
            {!fullscreen ? (
              <Link
                href="/chat"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-white/85 underline-offset-2 hover:text-white hover:underline"
              >
                <Maximize2 className="h-3 w-3" />
                Chat in Vollbild öffnen
              </Link>
            ) : null}
          </div>
          <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
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
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
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
              return (
                <li
                  key={m.id}
                  className={cn(
                    fullscreen ? "px-4 py-3" : "px-3 py-2.5",
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
                          {formatChatTime(m.created_at)}
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
                        className={cn(
                          "mt-0.5 block leading-snug text-slate-700",
                          fullscreen ? "text-sm" : "text-[13px]",
                        )}
                      />
                    </div>
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
            rows={fullscreen ? 3 : 2}
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
        {fullscreen ? (
          <p className="mt-1.5 text-[10px] text-slate-400">
            Max. {GROUP_CHAT_MAX_LEN} Zeichen · Enter senden · Shift+Enter neue Zeile
          </p>
        ) : null}
      </footer>
    </div>
  );
}
