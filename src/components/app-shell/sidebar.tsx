"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, PanelLeftOpen, UserPlus } from "lucide-react";
import { BrandLogo } from "@/components/app-shell/brand-logo";
import { appNav, NavList } from "@/components/app-shell/nav";
import { ReferMembershipNavCta } from "@/components/app-shell/refer-membership-nav-cta";
import { SidebarNavTooltip } from "@/components/app-shell/sidebar-nav-tooltip";
import { SidebarSpotifyPlayer } from "@/components/app-shell/sidebar-spotify-player";
import { cn } from "@/lib/cn";

export type SidebarUser = {
  name: string;
  initials: string;
  role: "admin" | "anni" | "member";
  points: number;
  rank: string;
  avatarUrl?: string | null;
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const isAdmin = user.role === "admin";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("fanclub-sidebar-collapsed");
      setCollapsed(raw === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--fanclub-sidebar-width",
      collapsed ? "5.25rem" : "16rem",
    );
    return () => {
      document.documentElement.style.removeProperty("--fanclub-sidebar-width");
    };
  }, [collapsed]);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem("fanclub-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden lg:sticky lg:top-0 lg:z-40 lg:flex lg:h-screen lg:flex-col lg:border-r lg:bg-[color:var(--background)]/95 lg:backdrop-blur",
        collapsed ? "lg:w-[5.25rem] lg:overflow-visible" : "lg:w-64",
      )}
    >
      {collapsed ? (
        <>
          <div className="flex shrink-0 flex-col items-center gap-2 border-b px-2 py-3">
            <Link
              href="/dashboard"
              className="block rounded-xl shadow-sm shadow-slate-900/10"
              title="Dashboard"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/fanclub-logo.png"
                alt="Anni Perka Fanclub"
                width={44}
                height={44}
                className="h-11 w-11 rounded-xl object-cover"
              />
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-xl border border-fc-ice bg-white text-fc-blue shadow-sm transition hover:border-fc-sky/40 hover:bg-fc-ice"
              aria-label="Menü ausklappen"
              title="Menü ausklappen"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-visible px-2 py-3">
            <NavList items={appNav} isAdmin={isAdmin} collapsed />
            <SidebarNavTooltip label="Mitglied werben">
              <Link
                href="/mitgliedschaft/einladen"
                className="grid h-10 w-10 place-items-center rounded-xl border border-fc-gold/30 bg-gradient-to-br from-fc-gold-soft to-fc-ice text-fc-gold shadow-sm transition hover:border-fc-gold/50 hover:shadow-md"
              >
                <UserPlus className="h-4 w-4" aria-hidden />
              </Link>
            </SidebarNavTooltip>
          </div>
        </>
      ) : (
        <>
          <div
            className="flex shrink-0 items-center gap-2 border-b px-3 lg:px-4"
            style={{ height: "var(--fanclub-chrome-header-height, 4rem)" }}
          >
            <BrandLogo
              showText
              className="min-w-0 flex-1"
              imageClassName="h-10 w-10"
            />
            <button
              type="button"
              onClick={toggle}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label="Menü einklappen"
              title="Menü einklappen"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-2">
            <div className="rounded-2xl border bg-white/70 p-2 shadow-sm shadow-slate-900/5 backdrop-blur">
              <NavList items={appNav} isAdmin={isAdmin} />
            </div>
            <div>
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-amber-800/70">
                Empfehlen
              </p>
              <ReferMembershipNavCta />
            </div>
          </div>
          <SidebarSpotifyPlayer />
        </>
      )}
    </aside>
  );
}
