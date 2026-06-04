"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/cn";

const SIZE = { xs: 20, sm: 24 } as const;

export function HoverEnlargeAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
  children,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm";
  className?: string;
  /** Optional: auch Name als Hover-Anker */
  children?: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const base = SIZE[size];
  const enlarged = base * 2;

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(rect.left + rect.width / 2 - enlarged / 2, window.innerWidth - enlarged - 8),
    );
    const top = Math.max(8, rect.top - enlarged - 8);
    setCoords({ top, left });
  }, [enlarged]);

  const preview =
    open && avatarUrl ? (
      <span
        role="presentation"
        style={{ top: coords.top, left: coords.left, width: enlarged, height: enlarged }}
        className="pointer-events-none fixed z-[250] overflow-hidden rounded-full border-2 border-white shadow-xl shadow-slate-900/25"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </span>
    ) : null;

  return (
    <span
      ref={anchorRef}
      className={cn("inline-flex items-center gap-1.5", className)}
      onMouseEnter={() => {
        if (!avatarUrl) return;
        updatePosition();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <UserAvatar name={name} avatarUrl={avatarUrl} size={size} />
      {children}
      {typeof document !== "undefined" && preview
        ? createPortal(preview, document.body)
        : null}
    </span>
  );
}
