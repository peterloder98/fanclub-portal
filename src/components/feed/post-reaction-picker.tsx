"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  POST_REACTION_META,
  POST_REACTION_TYPES,
  type PostReactionCounts,
  type PostReactionType,
  totalReactionCount,
} from "@/lib/posts/reactions";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import type { UserListEntry } from "@/components/ui/user-list-popover";

const LONG_PRESS_MS = 450;
const HOVER_OPEN_MS = 220;
const DEFAULT_REACTION: PostReactionType = "thumbs_up";
const PANEL_WIDTH = 240;

const ALTERNATIVE_REACTIONS = POST_REACTION_TYPES.filter((t) => t !== DEFAULT_REACTION);

type PostReactionPickerProps = {
  postId: string;
  myReaction: PostReactionType | null;
  reactionCounts: PostReactionCounts;
  disabled?: boolean;
  reactorsByType: Partial<Record<PostReactionType, UserListEntry[]>>;
  reactorsLoading?: boolean;
  onEnsureReactors: () => void;
  onInvalidateReactors: () => void;
  onReact: (type: PostReactionType | null) => void;
};

function ReactionBreakdownPopover({
  total,
  activeTypes,
  reactionCounts,
  reactorsByType,
  reactorsLoading,
  onEnsureReactors,
}: {
  total: number;
  activeTypes: PostReactionType[];
  reactionCounts: PostReactionCounts;
  reactorsByType: Partial<Record<PostReactionType, UserListEntry[]>>;
  reactorsLoading?: boolean;
  onEnsureReactors: () => void;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
    setCoords({ top: rect.bottom + 6, left });
  }, []);

  const handleEnter = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    updatePosition();
    setOpen(true);
    onEnsureReactors();
  };

  const handleLeave = (e: MouseEvent<HTMLSpanElement>) => {
    const next = e.relatedTarget as Node | null;
    if (panelRef.current?.contains(next)) return;
    setOpen(false);
  };

  const panel = open ? (
    <span
      ref={panelRef}
      role="tooltip"
      style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
      className="fixed z-[200] rounded-xl border bg-white p-3 text-left text-xs text-slate-700 shadow-lg shadow-slate-900/15"
      onMouseLeave={() => setOpen(false)}
    >
      <span className="font-semibold text-fc-navy">Reaktionen</span>
      <span className="mt-2 block space-y-2">
        {activeTypes.map((type) => {
          const users = reactorsByType[type] ?? [];
          return (
            <span key={type} className="block">
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <span aria-hidden>{POST_REACTION_META[type].emoji}</span>
                  {POST_REACTION_META[type].label}
                </span>
                <span className="tabular-nums text-slate-500">{reactionCounts[type]}</span>
              </span>
              {reactorsLoading ? (
                <span className="mt-0.5 block text-[10px] text-slate-400">Lade…</span>
              ) : users.length ? (
                <span className="mt-0.5 block space-y-0.5">
                  {users.map((u) => (
                    <span key={u.id} className="flex items-center gap-1.5 py-0.5">
                      <HoverEnlargeAvatar
                        name={u.name}
                        avatarUrl={u.avatarUrl}
                        size="xs"
                        href={`/mitglieder/${u.id}`}
                      >
                        <span className="min-w-0 truncate text-[11px] text-slate-600">{u.name}</span>
                      </HoverEnlargeAvatar>
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
    </span>
  ) : null;

  return (
    <span
      ref={anchorRef}
      className="inline-flex h-6 shrink-0 cursor-default items-center rounded-md px-1.5 text-xs tabular-nums text-slate-600 hover:bg-slate-50"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={(e) => e.stopPropagation()}
    >
      {total}
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </span>
  );
}

export function PostReactionPicker({
  myReaction,
  reactionCounts,
  disabled,
  reactorsByType,
  reactorsLoading,
  onEnsureReactors,
  onInvalidateReactors,
  onReact,
}: PostReactionPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  const total = totalReactionCount(reactionCounts);
  const activeTypes = POST_REACTION_TYPES.filter((t) => (reactionCounts[t] ?? 0) > 0);
  const triggerReaction = myReaction ?? DEFAULT_REACTION;
  const triggerEmoji = POST_REACTION_META[triggerReaction].emoji;
  const triggerLabel = myReaction
    ? `${POST_REACTION_META[myReaction].label} entfernen`
    : POST_REACTION_META[DEFAULT_REACTION].ariaLabel;

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDocPointer(e: PointerEvent) {
      if (!triggerRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [pickerOpen]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  function openPicker() {
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
    clearTimers();
  }

  function pick(type: PostReactionType) {
    const next = myReaction === type ? null : type;
    onInvalidateReactors();
    onReact(next);
    closePicker();
  }

  function handleTriggerClick(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    e.stopPropagation();
    if (disabled) return;
    if (pickerOpen) {
      closePicker();
      return;
    }
    if (myReaction) {
      onInvalidateReactors();
      onReact(null);
      return;
    }
    onInvalidateReactors();
    onReact(DEFAULT_REACTION);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (disabled || e.button !== 0) return;
    clearTimers();
    longPressTimer.current = setTimeout(() => {
      suppressClickRef.current = true;
      openPicker();
    }, LONG_PRESS_MS);
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTriggerPointerEnter() {
    if (disabled || typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;
    hoverTimer.current = setTimeout(openPicker, HOVER_OPEN_MS);
  }

  function handleTriggerPointerLeave() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setTimeout(() => {
      if (!triggerRef.current?.matches(":hover")) {
        setPickerOpen(false);
      }
    }, 120);
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      <div
        ref={triggerRef}
        className="relative shrink-0"
        onPointerEnter={handleTriggerPointerEnter}
        onPointerLeave={handleTriggerPointerLeave}
      >
        {pickerOpen ? (
          <div
            className="absolute bottom-full left-0 z-30 mb-1 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-lg shadow-slate-900/10"
            role="menu"
            aria-label="Reaktion wählen"
          >
            {ALTERNATIVE_REACTIONS.map((type) => (
              <button
                key={type}
                type="button"
                role="menuitem"
                title={POST_REACTION_META[type].label}
                aria-label={POST_REACTION_META[type].ariaLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  pick(type);
                }}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-xl transition hover:scale-110 hover:bg-slate-100",
                  myReaction === type && "bg-rose-50 ring-2 ring-rose-200",
                )}
              >
                <span aria-hidden>{POST_REACTION_META[type].emoji}</span>
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          aria-label={triggerLabel}
          aria-expanded={pickerOpen}
          onClick={handleTriggerClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition",
            myReaction ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/80" : "text-slate-600 hover:bg-slate-100",
            disabled ? "opacity-60" : "",
          )}
        >
          <span className="leading-none" aria-hidden>
            {triggerEmoji}
          </span>
        </button>
      </div>

      {total > 0 ? (
        <ReactionBreakdownPopover
          total={total}
          activeTypes={activeTypes}
          reactionCounts={reactionCounts}
          reactorsByType={reactorsByType}
          reactorsLoading={reactorsLoading}
          onEnsureReactors={onEnsureReactors}
        />
      ) : null}
    </div>
  );
}
