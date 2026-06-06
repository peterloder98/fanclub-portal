"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BrandLogo } from "@/components/app-shell/brand-logo";
import { NotificationBell } from "@/components/app-shell/notification-bell.client";
import { MobileNavDrawer } from "@/components/app-shell/mobile-nav-drawer";
import { useTopbarMeta } from "@/components/app-shell/topbar-context";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { PointsBurst } from "@/components/app-shell/points-burst";
import { usePointsTopbar } from "@/lib/points/use-points-topbar";
import { POINTS_TARGET_ID, setPointsTargetElement } from "@/lib/points/target";
import { Badge } from "@/components/ui/badge";
import { ANNI_STARS_LABEL } from "@/lib/anni-stars/terminology";
import { ANNI_STAR_COLOR, ANNI_STAR_SYMBOL } from "@/lib/anni-stars/format";

/** Persistente Kopfzeile — bleibt beim Navigieren zwischen Seiten gemountet. */
export function TopbarChrome() {
  const { meta } = useTopbarMeta();
  const { title, subtitle, className } = meta;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");
  const [name, setName] = useState<string>("Mitglied");
  const [email, setEmail] = useState<string | null>(null);
  const [membershipNumber, setMembershipNumber] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "anni" | "member">("member");
  const [userId, setUserId] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const { points, rank, refreshPoints } = usePointsTopbar(userId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 288 });
  const profileRef = useRef<HTMLDivElement>(null);
  const profileOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeNotificationsRef = useRef<(() => void) | null>(null);

  const updateMenuPos = useCallback(() => {
    const el = profileRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 16);
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setMenuPos({ top: r.bottom - 4, left, width });
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!profileOpen) return;
    updateMenuPos();
    const onReposition = () => updateMenuPos();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [profileOpen, updateMenuPos]);

  function closeNotifications() {
    closeNotificationsRef.current?.();
  }

  function scheduleProfileOpen() {
    if (profileCloseTimer.current) clearTimeout(profileCloseTimer.current);
    profileOpenTimer.current = setTimeout(() => {
      closeNotifications();
      setProfileOpen(true);
    }, 100);
  }

  function scheduleProfileClose() {
    if (profileOpenTimer.current) clearTimeout(profileOpenTimer.current);
    profileCloseTimer.current = setTimeout(() => setProfileOpen(false), 180);
  }

  useEffect(() => {
    return () => {
      if (profileOpenTimer.current) clearTimeout(profileOpenTimer.current);
      if (profileCloseTimer.current) clearTimeout(profileCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_path,role,updated_at,email,membership_number")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const displayName =
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : (user.email ?? "User");
      setName(displayName);
      setEmail(profile?.email ?? user.email ?? null);
      setMembershipNumber(profile?.membership_number ?? null);
      setRole((profile?.role ?? "member") as "admin" | "anni" | "member");
      const parts = displayName.trim().split(/\s+/).filter(Boolean);
      const first = parts.at(0)?.[0] ?? "U";
      const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
      setInitials((first + last).toUpperCase());
      setAvatarUrl(
        getAvatarPublicUrl(profile?.avatar_path ?? null, profile?.updated_at ?? null),
      );
      setProfileLoaded(true);
      await refreshPoints(user.id);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, refreshPoints]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 z-[200] flex items-center gap-3 border-b bg-[color:var(--background)]/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur",
          "h-[var(--fanclub-chrome-header-height,4rem)]",
          (profileOpen || notificationsOpen) && "z-[9998]",
          notificationsOpen && "z-[10052]",
          "inset-x-0 lg:left-[var(--fanclub-sidebar-width,16rem)] lg:right-0 lg:px-8",
          className,
        )}
      >
        <MobileNavDrawer isAdmin={role === "admin"} />
        <BrandLogo className="lg:hidden" showText={false} imageClassName="h-10 w-10" />
        <div className="min-w-0 flex-1" title={subtitle}>
          <div className="truncate text-base font-semibold leading-tight text-fc-navy">
            {title}
          </div>
          {subtitle ? (
            <div className="hidden truncate text-sm leading-tight text-slate-600 lg:block">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex h-10 items-center gap-1.5 sm:gap-2">
          <Link
            href="/punkte"
            className="relative flex h-10 min-w-[3.25rem] flex-col items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-blue-50/50 px-2 shadow-sm shadow-slate-900/5 transition hover:border-fc-sky/30 sm:min-w-[4.5rem] sm:px-2.5"
            aria-label={`${ANNI_STARS_LABEL}: ${points}, Rang ${rank}`}
          >
            <PointsBurst />
            <span className="text-[9px] font-medium leading-none text-slate-500">Anni-Stars</span>
            <span
              id={POINTS_TARGET_ID}
              data-points-target="true"
              ref={(el) => setPointsTargetElement(el)}
              className="inline-flex items-center gap-0.5 text-center text-sm font-bold leading-none tabular-nums text-fc-navy"
            >
              <span style={{ color: ANNI_STAR_COLOR }} className="text-[11px]" aria-hidden>
                {ANNI_STAR_SYMBOL}
              </span>
              {profileLoaded ? points : "…"}
              <span style={{ color: ANNI_STAR_COLOR }} className="text-[11px]" aria-hidden>
                {ANNI_STAR_SYMBOL}
              </span>
            </span>
          </Link>
          <div className="hidden h-10 min-w-[4.5rem] items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-rose-50/40 px-2.5 text-center shadow-sm shadow-slate-900/5 sm:flex">
            <div className="leading-none">
              <div className="text-[9px] font-medium text-slate-500">Rang</div>
              <div className="text-sm font-bold text-fc-navy">
                {profileLoaded ? rank : "…"}
              </div>
            </div>
          </div>

          <div className="relative shrink-0">
            <NotificationBell
              onOpenChange={(open) => {
                setNotificationsOpen(open);
                if (open) setProfileOpen(false);
              }}
              onRegisterClose={(fn) => {
                closeNotificationsRef.current = fn;
              }}
            />
          </div>

          <div
            className="relative"
            ref={profileRef}
            onMouseEnter={scheduleProfileOpen}
            onMouseLeave={scheduleProfileClose}
          >
            <button
              type="button"
              onClick={() => {
                closeNotifications();
                setProfileOpen((v) => !v);
              }}
              className="block h-9 w-9 overflow-hidden rounded-full border bg-slate-50 shadow-sm shadow-slate-900/10 ring-offset-2 transition hover:ring-2 hover:ring-fc-sky/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-sky"
              aria-label="Profilmenü"
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-fc-navy to-fc-sky text-xs font-bold text-white">
                  {initials}
                </div>
              )}
            </button>

          </div>
        </div>
      </header>
      <div
        className="shrink-0 pt-[env(safe-area-inset-top,0px)]"
        style={{ height: "var(--fanclub-chrome-header-height, 4rem)" }}
        aria-hidden
      />
      {portalReady && profileOpen && !notificationsOpen
        ? createPortal(
            <div
              className="fixed z-[9999] pt-2"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
              onMouseEnter={scheduleProfileOpen}
              onMouseLeave={scheduleProfileClose}
            >
              <div className="pointer-events-auto rounded-2xl border bg-white p-3 shadow-xl shadow-fc-navy/20">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-slate-50">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-fc-navy to-fc-sky text-sm font-bold text-white">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-fc-navy">{name}</div>
                    {email ? (
                      <div className="truncate text-xs text-slate-600">{email}</div>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {membershipNumber ? (
                        <Badge variant="neutral" className="text-[10px]">
                          Nr. {membershipNumber}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex h-9 items-center justify-center rounded-xl border bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
                  >
                    Mein Profil
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false);
                      const s = createSupabaseBrowserClient();
                      await s.auth.signOut();
                      window.location.href = "/login";
                    }}
                    className="flex h-9 items-center justify-center rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue"
                  >
                    Abmelden
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
