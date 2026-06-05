"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandLogo } from "@/components/app-shell/brand-logo";
import { appNav, NavList } from "@/components/app-shell/nav";
import { ReferMembershipNavCta } from "@/components/app-shell/refer-membership-nav-cta";
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
        "hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:bg-[color:var(--background)]/80 lg:backdrop-blur",
        collapsed ? "lg:w-[4.5rem]" : "lg:w-64",
      )}
    >
      <div className={cn("flex h-14 shrink-0 items-center gap-3 px-3", collapsed && "justify-between")}>
        <BrandLogo showText={!collapsed} imageClassName={collapsed ? "h-10 w-10" : undefined} />
        <button
          type="button"
          onClick={toggle}
          className="ml-auto grid h-9 w-9 place-items-center rounded-xl border bg-white text-slate-700 shadow-sm"
          aria-label={collapsed ? "Menü ausklappen" : "Menü einklappen"}
          title={collapsed ? "Menü ausklappen" : "Menü einklappen"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed ? (
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
      ) : (
        <div className="flex-1" />
      )}

      {!collapsed ? <SidebarSpotifyPlayer /> : null}
    </aside>
  );
}
