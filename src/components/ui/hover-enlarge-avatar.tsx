"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/cn";
import { initialsFromName } from "@/lib/user/initials";

const SIZE = { xs: 20, sm: 24 } as const;
const HOVER_CLOSE_MS = 220;

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
  children?: ReactNode;
}) {
  const hoverRef = useRef<HTMLSpanElement>(null);
  const avatarRef = useRef<HTMLSpanElement>(null);
  const previewRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const base = SIZE[size];
  const enlarged = base * 2;

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = avatarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.max(
      8,
      Math.min(rect.left + rect.width / 2 - enlarged / 2, window.innerWidth - enlarged - 8),
    );
    const top = Math.max(8, rect.top - enlarged - 8);
    setCoords({ top, left });
  }, [enlarged]);

  const showPreview = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const scheduleHide = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updatePosition]);

  const preview = open ? (
    <span
      ref={previewRef}
      role="tooltip"
      style={{ top: coords.top, left: coords.left, width: enlarged, height: enlarged }}
      className="fixed z-[250] pointer-events-auto"
      onMouseEnter={showPreview}
      onMouseLeave={scheduleHide}
    >
      <span className="block h-full w-full overflow-hidden rounded-full border-2 border-white shadow-xl shadow-slate-900/25">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-fc-navy to-fc-sky text-sm font-bold text-white">
            {initialsFromName(name)}
          </span>
        )}
      </span>
    </span>
  ) : null;

  return (
    <span
      ref={hoverRef}
      className={cn("inline-flex items-center gap-1.5", className)}
      onMouseEnter={showPreview}
      onMouseLeave={scheduleHide}
    >
      <span ref={avatarRef} className="inline-flex shrink-0">
        <UserAvatar name={name} avatarUrl={avatarUrl} size={size} />
      </span>
      {children ? <span className="min-w-0">{children}</span> : null}
      {typeof document !== "undefined" && preview
        ? createPortal(preview, document.body)
        : null}
    </span>
  );
}
