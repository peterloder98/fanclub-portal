"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { initialsFromName } from "@/lib/user/initials";
import { cn } from "@/lib/cn";
import { isHiddenProfileId, memberProfileHref } from "@/lib/members/hidden";

const profileCache = new Map<string, { name: string; avatarUrl: string | null }>();
const HOVER_CLOSE_MS = 200;

export function MentionProfileLink({
  userId,
  name,
  className,
}: {
  userId: string;
  name: string;
  className?: string;
}) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [profile, setProfile] = useState<{ name: string; avatarUrl: string | null } | null>(
    () => profileCache.get(userId) ?? null,
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 220;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const top = Math.max(8, rect.top - 88);
    setCoords({ top, left });
  }, []);

  const showPreview = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
    if (!profileCache.has(userId)) {
      void (async () => {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase
          .from("profiles")
          .select("first_name,last_name,email,avatar_path,updated_at")
          .eq("id", userId)
          .maybeSingle();
        if (!data) return;
        const displayName =
          data.first_name && data.last_name
            ? `${data.first_name} ${data.last_name}`
            : (data.email ?? name);
        const entry = {
          name: displayName,
          avatarUrl: getAvatarPublicUrl(data.avatar_path, data.updated_at),
        };
        profileCache.set(userId, entry);
        setProfile(entry);
      })();
    }
  }, [clearCloseTimer, name, updatePosition, userId]);

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

  const display = profile ?? { name, avatarUrl: null };
  const href = memberProfileHref(userId);

  if (!href || isHiddenProfileId(userId)) {
    return <span className={cn("font-semibold text-slate-700", className)}>{name}</span>;
  }

  const preview = open ? (
    <div
      role="tooltip"
      style={{ top: coords.top, left: coords.left }}
      className="pointer-events-auto fixed z-[260] flex items-center gap-2.5 rounded-2xl border bg-white p-2 pr-3 shadow-xl shadow-slate-900/15"
      onMouseEnter={showPreview}
      onMouseLeave={scheduleHide}
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        {display.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={display.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-fc-navy to-fc-sky text-lg font-bold text-white">
            {initialsFromName(display.name)}
          </div>
        )}
      </div>
      <span className="max-w-[8rem] text-sm font-semibold leading-tight text-fc-navy">
        {display.name}
      </span>
    </div>
  ) : null;

  return (
    <>
      <Link
        ref={anchorRef}
        href={href}
        className={cn(
          "rounded-md bg-fc-ice px-1 py-0.5 font-semibold text-fc-blue hover:bg-fc-sky/30",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={showPreview}
        onMouseLeave={scheduleHide}
        onFocus={showPreview}
        onBlur={scheduleHide}
        onTouchStart={() => showPreview()}
      >
        {name}
      </Link>
      {typeof document !== "undefined" && preview ? createPortal(preview, document.body) : null}
    </>
  );
}
