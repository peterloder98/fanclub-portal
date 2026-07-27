import type { ReactNode } from "react";
import { AppShellClient } from "@/components/app-shell/app-shell-client";
import { SkipToContent } from "@/components/app-shell/skip-to-content";
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let sidebarUser: SidebarUser = {
    name: "Unbekannt",
    initials: "U",
    role: "member",
    points: 0,
    rank: rankFromPoints(0),
  };
  let needsIntroOnboarding = false;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name,last_name,role,avatar_path,updated_at,intro_onboarding_dismissed_at")
      .eq("id", user.id)
      .maybeSingle();

    // Spalte fehlt ggf. vor Migration → ohne Intro-Feld erneut laden
    const safeProfile =
      profile ??
      (profileError
        ? (
            await supabase
              .from("profiles")
              .select("first_name,last_name,role,avatar_path,updated_at")
              .eq("id", user.id)
              .maybeSingle()
          ).data
        : null);

    const name =
      safeProfile?.first_name && safeProfile?.last_name
        ? `${safeProfile.first_name} ${safeProfile.last_name}`
        : user.email ?? "Mitglied";

    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: pointsRows } = await supabase
      .from("points_transactions")
      .select("points,created_at")
      .eq("user_id", user.id)
      .gte("created_at", yearStart);
    const points = (pointsRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);

    sidebarUser = {
      name,
      initials: initialsFromName(name),
      role: (safeProfile?.role ?? "member") as SidebarUser["role"],
      points,
      rank: rankFromPoints(points),
      avatarUrl: safeProfile?.avatar_path
        ? `${avatarPublicUrl(safeProfile.avatar_path)}?v=${encodeURIComponent(safeProfile.updated_at ?? "")}`
        : null,
    };

    needsIntroOnboarding =
      safeProfile != null &&
      "intro_onboarding_dismissed_at" in safeProfile &&
      (safeProfile as { intro_onboarding_dismissed_at?: string | null }).intro_onboarding_dismissed_at ==
        null;
  }

  return (
    <div className="flex h-dvh max-h-dvh w-full max-w-full flex-col overflow-hidden lg:flex-row">
      <SkipToContent />
      <Sidebar user={sidebarUser} />
      <AppShellClient needsIntroOnboarding={needsIntroOnboarding}>{children}</AppShellClient>
    </div>
  );
}
