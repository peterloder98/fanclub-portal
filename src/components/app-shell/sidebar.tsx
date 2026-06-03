"use client";

import { BrandLogo } from "@/components/app-shell/brand-logo";
import { appNav, NavList } from "@/components/app-shell/nav";
import { SidebarSpotifyPlayer } from "@/components/app-shell/sidebar-spotify-player";

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

  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:bg-[color:var(--background)]/80 lg:backdrop-blur">
      <div className="flex h-14 shrink-0 items-center gap-3 px-3">
        <BrandLogo />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="rounded-2xl border bg-white/70 p-2 shadow-sm shadow-slate-900/5 backdrop-blur">
          <NavList items={appNav} isAdmin={isAdmin} />
        </div>
      </div>

      <SidebarSpotifyPlayer />
    </aside>
  );
}
