"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { BrandLogo } from "@/components/app-shell/brand-logo";
import { MobileNavDrawer } from "@/components/app-shell/mobile-nav-drawer";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { PointsBurst } from "@/components/app-shell/points-burst";
import { usePointsTopbar } from "@/lib/points/use-points-topbar";
import { POINTS_TARGET_ID, setPointsTargetElement } from "@/lib/points/target";

export function Topbar({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");
  const [name, setName] = useState<string>("Mitglied");
  const [role, setRole] = useState<"admin" | "anni" | "member">("member");
  const [userId, setUserId] = useState<string | null>(null);
  const { points, rank, refreshPoints } = usePointsTopbar(userId);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_path,role,updated_at")
        .eq("id", user.id)
        .maybeSingle();
      const displayName =
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : (user.email ?? "User");
      setName(displayName);
      setRole((profile?.role ?? "member") as "admin" | "anni" | "member");
      const parts = displayName.trim().split(/\s+/).filter(Boolean);
      const first = parts.at(0)?.[0] ?? "U";
      const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
      setInitials((first + last).toUpperCase());
      setAvatarUrl(
        getAvatarPublicUrl(profile?.avatar_path ?? null, profile?.updated_at ?? null),
      );
      await refreshPoints(user.id);
    }
    void load();
  }, [supabase, refreshPoints]);

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-[color:var(--background)]/80 px-4 backdrop-blur lg:px-8",
        className,
      )}
    >
      <MobileNavDrawer isAdmin={role === "admin"} />
      <BrandLogo className="lg:hidden" showText={false} imageClassName="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-900">
          {title}
        </div>
        {subtitle ? (
          <div className="truncate text-sm text-slate-600">{subtitle}</div>
        ) : null}
      </div>

      <div className="ml-auto flex h-10 items-center gap-2">
        <Link
          href="/punkte"
          className="relative flex h-10 min-w-[4.5rem] flex-col items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-blue-50/50 px-2.5 shadow-sm shadow-slate-900/5 transition hover:border-blue-200"
          aria-label={`Statuspunkte: ${points}, Rang ${rank}`}
        >
          <PointsBurst />
          <span className="text-[9px] font-medium leading-none text-slate-500">Punkte</span>
          <span
            id={POINTS_TARGET_ID}
            data-points-target="true"
            ref={(el) => setPointsTargetElement(el)}
            className="text-center text-sm font-bold leading-none tabular-nums text-slate-900"
          >
            {points}
          </span>
        </Link>
        <div className="flex h-10 min-w-[4.5rem] items-center justify-center rounded-xl border border-slate-200/90 bg-gradient-to-br from-white to-rose-50/40 px-2.5 text-center shadow-sm shadow-slate-900/5">
          <div className="leading-none">
            <div className="text-[9px] font-medium text-slate-500">Rang</div>
            <div className="text-sm font-bold text-slate-900">{rank}</div>
          </div>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border bg-white shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
          aria-label="Benachrichtigungen"
        >
          <Bell className="h-4 w-4 text-slate-600" />
        </button>

        <div className="group relative z-20">
          <button
            type="button"
            className="block h-10 w-10 overflow-hidden rounded-full border bg-slate-50 shadow-sm shadow-slate-900/10 ring-offset-2 transition hover:ring-2 hover:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            aria-label="Profilmenü"
            aria-haspopup="true"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-600 to-rose-500 text-xs font-bold text-white">
                {initials}
              </div>
            )}
          </button>

          <div className="pointer-events-none invisible absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
            <div className="rounded-2xl border bg-white p-3 shadow-lg shadow-slate-900/15">
              <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border bg-slate-50">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-600 to-rose-500 text-xs font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {name}
                </div>
                <div className="text-xs capitalize text-slate-600">{role}</div>
              </div>
              </div>

              <div className="mt-3 grid gap-2">
                <Link
                  href="/punkte"
                  className="flex h-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50/50 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-50"
                >
                  Statuspunkte
                </Link>
                <Link
                  href="/profile"
                  className="flex h-9 items-center justify-center rounded-xl border bg-white text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
                >
                  Profil
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const s = createSupabaseBrowserClient();
                    await s.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="flex h-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800"
                >
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
