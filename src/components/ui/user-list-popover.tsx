"use client";

import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { cn } from "@/lib/cn";

export type UserListEntry = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

const PANEL_WIDTH = 224;

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
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left =
      align === "end" ? rect.right - PANEL_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_WIDTH - 8));
    setCoords({ top: rect.bottom + 6, left });
  }, [align]);

  const handleEnter = (e: MouseEvent<HTMLSpanElement>) => {
    updatePosition();
    setOpen(true);
    onMouseEnter?.(e);
  };

  const panel = open ? (
    <span
      role="tooltip"
      style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
      className="pointer-events-none fixed z-[200] rounded-xl border bg-white p-3 text-left text-xs text-slate-700 shadow-lg shadow-slate-900/15"
    >
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="mt-2 block max-h-44 overflow-y-auto">
        {loading ? (
          "Lade…"
        ) : users.length ? (
          users.slice(0, 16).map((u) => (
            <span key={u.id} className="flex items-center gap-2 py-1">
              <HoverEnlargeAvatar name={u.name} avatarUrl={u.avatarUrl} size="xs">
                <span className="min-w-0 truncate">{u.name}</span>
              </HoverEnlargeAvatar>
            </span>
          ))
        ) : (
          "Noch keine Einträge"
        )}
        {users.length > 16 ? (
          <span className="mt-1 block text-slate-500">+{users.length - 16} weitere…</span>
        ) : null}
      </span>
    </span>
  ) : null;

  return (
    <span
      ref={anchorRef}
      className={cn(
        "relative inline-flex shrink-0 rounded-lg px-2 py-1 tabular-nums hover:bg-white/80",
        className,
      )}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
      onClick={onClick}
    >
      {children}
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </span>
  );
}
