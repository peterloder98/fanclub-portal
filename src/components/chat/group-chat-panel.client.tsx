"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Maximize2,
  MessageCircle,
  SendHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MentionInput, type MentionInputHandle } from "@/components/feed/mention-input";
import { MentionText } from "@/components/feed/mention-text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmojiPickerButton } from "@/components/ui/emoji-picker";
import { formatChatTime, type OnlineMember } from "@/lib/chat/types";
import type { ChatMessage } from "@/lib/chat/use-group-chat";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MemberProfileAnchor } from "@/components/members/member-profile-anchor";
import { isHiddenProfileId } from "@/lib/members/hidden";

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
            {onlineMembers
              .filter((m) => !isHiddenProfileId(m.id))
              .map((m) => (
              <li key={m.id}>
                <MemberProfileAnchor
                  userId={m.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-fc-ice"
                  linkProps={{ onClick: (e) => e.stopPropagation() }}
                >
                  <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs" />
                  <span className="min-w-0 truncate font-medium text-fc-navy">{m.name}</span>
                </MemberProfileAnchor>
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
        const warnOk = window.confirm(
          "Verwarnung aussprechen und automatische E-Mail an das Mitglied senden?",
        );
        if (!warnOk) return;
        const deleteOk = window.confirm(
          "Nachricht zusätzlich löschen?\n\nOK = löschen + verwarnen\nAbbrechen = nur verwarnen (bleibt stehen)",
        );
        if (deleteOk) onRemoved();
        startTransition(async () => {
          try {
            const result = await issueCommentWarning({
              commentType: "chat",
              commentId: messageId,
              deleteComment: deleteOk,
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
  muted: boolean;
  onToggleMuted: () => void;
  typingIndicator?: { userId: string; name: string } | null;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  onDelete: (id: string) => void;
  onRemoveLocal?: (id: string) => void;
  onCollapse?: () => void;
  onClose?: () => void;
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
  muted,
  onToggleMuted,
  typingIndicator = null,
  onDraftChange,
  onSend,
  onDelete,
  onRemoveLocal,
  onCollapse,
  onClose,
  className,
}: PanelProps) {
  const fullscreen = mode === "fullscreen";
  const [composerFocused, setComposerFocused] = useState(false);
  const footerRef = useRef<HTMLElement>(null);
  const mentionRef = useRef<MentionInputHandle>(null);

  useEffect(() => {
    if (!composerFocused || typeof window === "undefined") return;
    const footer = footerRef.current;
    if (!footer) return;
    const scrollIntoView = () => {
      footer.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    scrollIntoView();
    const vv = window.visualViewport;
    if (!vv) return;
    vv.addEventListener("resize", scrollIntoView);
    return () => vv.removeEventListener("resize", scrollIntoView);
  }, [composerFocused]);

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
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMuted();
            }}
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
            aria-label={muted ? "Chat-Ton einschalten" : "Chat lautlos"}
            title={
              muted
                ? "Ton einschalten (spielt Testton)"
                : "Ton an — Klick für Lautlos"
            }
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {!fullscreen && onCollapse ? (
            <button
              type="button"
              onClick={() => onCollapse()}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Chat verkleinern"
              title="Verkleinern"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : null}
          {fullscreen && onClose ? (
            <button
              type="button"
              onClick={() => onClose()}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
              aria-label="Chat schließen"
              title="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
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
                      <MemberProfileAnchor
                        userId={m.author_id}
                        className="shrink-0 sm:hidden"
                        linkProps={{ "aria-label": `Portal von ${m.author.name}` }}
                      >
                        <UserAvatar
                          name={m.author.name}
                          avatarUrl={m.author.avatarUrl}
                          size="xs"
                        />
                      </MemberProfileAnchor>
                      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-fc-navy">
                        <MemberProfileAnchor
                          userId={m.author_id}
                          className="hover:text-fc-blue hover:underline"
                        >
                          {m.author.name}
                        </MemberProfileAnchor>
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
        ref={footerRef}
        className={cn(
          "shrink-0 border-t border-fc-navy/10 bg-fc-mist/80",
          fullscreen ? "p-3" : "p-2.5",
        )}
      >
        {typingIndicator ? (
          <div
            className={cn(
              "mb-2 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-fc-navy via-fc-blue to-fc-navy px-3 py-1.5 text-sm font-semibold tracking-tight text-white shadow-sm shadow-fc-navy/20",
            )}
            aria-live="polite"
          >
            <span className="flex items-center gap-1" aria-hidden>
              <span className="fc-typing-dot h-2 w-2 rounded-full bg-fc-gold" />
              <span className="fc-typing-dot h-2 w-2 rounded-full bg-fc-gold [animation-delay:0.15s]" />
              <span className="fc-typing-dot h-2 w-2 rounded-full bg-fc-gold [animation-delay:0.3s]" />
            </span>
            <span className="min-w-0 truncate leading-none">
              {typingIndicator.name} <span className="font-bold text-fc-gold">tippt…</span>
            </span>
          </div>
        ) : null}
        {error && !/warten|cooldown|zu schnell/i.test(error) ? (
          <p className="mb-1.5 text-[11px] text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-1.5">
          <MentionInput
            ref={mentionRef}
            value={draft}
            onChange={(v) => onDraftChange(v.replace(/\r?\n/g, " "))}
            multiline={false}
            rows={1}
            disabled={sending}
            placeholder="Nachricht… @ · Enter sendet"
            className="min-w-0 flex-1"
            inputClassName={cn(
              "box-border h-10 w-full min-w-0 max-w-full overflow-hidden rounded-xl border bg-white text-base text-fc-navy outline-none focus:ring-2 lg:text-sm",
              overLimit
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                : "border-fc-navy/15 focus:border-fc-blue focus:ring-fc-sky/30",
            )}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              e.preventDefault();
              if (sending || cooldownActive || !draft.trim() || overLimit) return;
              void onSend();
            }}
          />
          <EmojiPickerButton
            tone="navy"
            placement="up"
            disabled={sending}
            onPick={(emoji) => mentionRef.current?.insertText(emoji)}
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
