import type { ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/sidebar";
import type { SidebarUser } from "@/components/app-shell/sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rankFromPoints } from "@/lib/points/rank";
import { avatarPublicUrl } from "@/lib/avatars/public";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.[0] ?? "U";
  const last = parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  async function loadUser(): Promise<SidebarUser> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Middleware should prevent this, but keep a safe fallback.
    if (!user) {
      return {
        name: "Unbekannt",
        initials: "U",
        role: "member",
        points: 0,
        rank: rankFromPoints(0),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name,last_name,role,avatar_path,updated_at")
      .eq("id", user.id)
      .maybeSingle();

    const name =
      profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : user.email ?? "Mitglied";

    // Points (v1): sum of points_transactions for current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: pointsRows } = await supabase
      .from("points_transactions")
      .select("points,created_at")
      .eq("user_id", user.id)
      .gte("created_at", yearStart);
    const points = (pointsRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);

    return {
      name,
      initials: initialsFromName(name),
      role: (profile?.role ?? "member") as SidebarUser["role"],
      points,
      rank: rankFromPoints(points),
      avatarUrl: profile?.avatar_path
        ? `${avatarPublicUrl(profile.avatar_path)}?v=${encodeURIComponent(profile.updated_at ?? "")}`
        : null,
    };
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar user={await loadUser()} />
      <div className="min-h-0 min-w-0 flex-1 lg:flex lg:flex-col">{children}</div>
    </div>
  );
}

