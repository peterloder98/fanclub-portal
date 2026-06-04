"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { cn } from "@/lib/cn";

export type UserListEntry = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

const PANEL_WIDTH = 224;
/** ~6 Einträge sichtbar, danach scrollen */
const LIST_MAX_HEIGHT = 192;

export function UserListPopover({
  label,
  users,
  loading,
  children,
  className,
  align = "start",
  onMouseEnter,
  onClick,
}: {
  label: string;
  users: UserListEntry[];
  loading?: boolean;
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
  onMouseEnter?: (e: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const open = hoverOpen || pinned;

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = align === "end" ? rect.right - PANEL_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
    setCoords({ top: rect.bottom + 6, left });
  }, [align]);

  const handleEnter = (e: MouseEvent<HTMLSpanElement>) => {
    updatePosition();
    setHoverOpen(true);
    onMouseEnter?.(e);
  };

  const handleLeave = (e: MouseEvent<HTMLSpanElement>) => {
    const next = e.relatedTarget as Node | null;
    if (panelRef.current?.contains(next)) return;
    setHoverOpen(false);
  };

  const handleAnchorClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    updatePosition();
    setPinned((p) => !p);
    setHoverOpen(false);
    onClick?.(e);
  };

  useEffect(() => {
    if (!pinned) return;
    function onDoc(e: Event) {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setPinned(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [pinned]);

  const panel = open ? (
    <span
      ref={panelRef}
      role="dialog"
      aria-label={label}
      style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
      className={cn(
        "fixed z-[200] rounded-xl border bg-white p-3 text-left text-xs text-slate-700 shadow-lg shadow-slate-900/15",
        pinned && "pointer-events-auto",
        !pinned && "pointer-events-none",
      )}
      onMouseLeave={() => {
        if (!pinned) setHoverOpen(false);
      }}
    >
      <span className="font-semibold text-slate-900">{label}</span>
      {pinned ? (
        <span className="mt-0.5 block text-[10px] text-slate-500">Erneut klicken zum Schließen</span>
      ) : null}
      <span
        className="mt-2 block overflow-y-auto overscroll-contain"
        style={{ maxHeight: LIST_MAX_HEIGHT }}
      >
        {loading ? (
          "Lade…"
        ) : users.length ? (
          users.map((u) => (
            <span key={u.id} className="flex items-center gap-2 py-1">
              <HoverEnlargeAvatar name={u.name} avatarUrl={u.avatarUrl} size="xs">
                <span className="min-w-0 truncate">{u.name}</span>
              </HoverEnlargeAvatar>
            </span>
          ))
        ) : (
          "Noch keine Einträge"
        )}
      </span>
    </span>
  ) : null;

  return (
    <span
      ref={anchorRef}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-lg px-2 py-1 tabular-nums hover:bg-white/80",
        pinned && "ring-2 ring-blue-200 ring-offset-1",
        className,
      )}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleAnchorClick}
    >
      {children}
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </span>
  );
}
