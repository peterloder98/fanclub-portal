"use client";

import Link from "next/link";
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
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-rose-500 text-sm font-bold text-white shadow-sm shadow-slate-900/10">
            AP
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">
              Anni Perka Fanclub
            </div>
            <div className="text-xs text-slate-600">Portal</div>
          </div>
        </Link>
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
