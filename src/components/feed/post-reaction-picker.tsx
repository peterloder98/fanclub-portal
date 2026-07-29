"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  POST_REACTION_META,
  POST_REACTION_TYPES,
  type PostReactionCounts,
  type PostReactionType,
  totalReactionCount,
} from "@/lib/posts/reactions";
import { UserListPopover, type UserListEntry } from "@/components/ui/user-list-popover";

const LONG_PRESS_MS = 450;
const HOVER_OPEN_MS = 280;

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
  const rootRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);

  const total = totalReactionCount(reactionCounts);
  const activeTypes = POST_REACTION_TYPES.filter((t) => (reactionCounts[t] ?? 0) > 0);

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
      if (!rootRef.current?.contains(e.target as Node)) {
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
    onReact("heart");
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

  function handlePointerEnter() {
    if (disabled || typeof window === "undefined") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;
    hoverTimer.current = setTimeout(openPicker, HOVER_OPEN_MS);
  }

  function handlePointerLeave() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setTimeout(() => {
      if (!rootRef.current?.matches(":hover")) {
        setPickerOpen(false);
      }
    }, 120);
  }

  const triggerEmoji = myReaction ? POST_REACTION_META[myReaction].emoji : "👍";
  const triggerLabel = myReaction
    ? `${POST_REACTION_META[myReaction].label} entfernen`
    : "Reagieren";

  return (
    <div
      ref={rootRef}
      className="relative inline-flex items-center gap-1"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {pickerOpen ? (
        <div
          className="absolute bottom-full left-0 z-30 mb-1 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-lg shadow-slate-900/10"
          role="menu"
          aria-label="Reaktion wählen"
        >
          {POST_REACTION_TYPES.map((type) => (
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
          "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition",
          myReaction ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50",
          disabled ? "opacity-60" : "",
        )}
      >
        <span className="text-base leading-none" aria-hidden>
          {triggerEmoji}
        </span>
        {myReaction ? null : <span>Reagieren</span>}
      </button>

      {total > 0 ? (
        <div className="inline-flex flex-wrap items-center gap-1">
          {activeTypes.map((type) => {
            const users = reactorsByType[type] ?? [];
            return (
              <UserListPopover
                key={type}
                label={`${POST_REACTION_META[type].label} (${reactionCounts[type]})`}
                users={users}
                loading={reactorsLoading}
                onMouseEnter={onEnsureReactors}
                className="inline-flex h-6 items-center gap-0.5 rounded-md px-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                <span aria-hidden>{POST_REACTION_META[type].emoji}</span>
                <span className="tabular-nums">{reactionCounts[type]}</span>
              </UserListPopover>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
