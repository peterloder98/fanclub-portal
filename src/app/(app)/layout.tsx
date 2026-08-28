import type { ReactNode } from "react";
import { AppShellClient } from "@/components/app-shell/app-shell-client";
import { SkipToContent } from "@/components/app-shell/skip-to-content";
import { Sidebar } from "@/components/app-shell/sidebar";
import type { SidebarUser } from "@/components/app-shell/sidebar";
import { getRequestMeProfile } from "@/lib/auth/request-auth";
import { rankFromPoints } from "@/lib/points/rank";
import { avatarPublicUrl } from "@/lib/avatars/public";
import { isBrowseOnlyProfileId } from "@/lib/members/hidden";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts.at(0)?.[0] ?? "U";
  const last = parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile: safeProfile } = await getRequestMeProfile();

  let sidebarUser: SidebarUser = {
    name: "Unbekannt",
    initials: "U",
    role: "member",
    // Punkte/Rang kommen aus dem Client-Topbar (Realtime) — hier ungenutzt, kein RPC.
    points: 0,
    rank: rankFromPoints(0),
  };
  let needsWelcomeOnboarding = false;

  if (user) {
    const name =
      safeProfile?.first_name && safeProfile?.last_name
        ? `${safeProfile.first_name} ${safeProfile.last_name}`
        : user.email ?? "Mitglied";

    sidebarUser = {
      name,
      initials: initialsFromName(name),
      role: (safeProfile?.role ?? "member") as SidebarUser["role"],
      points: 0,
      rank: rankFromPoints(0),
      avatarUrl: safeProfile?.avatar_path
        ? `${avatarPublicUrl(safeProfile.avatar_path)}?v=${encodeURIComponent(safeProfile.updated_at ?? "")}`
        : null,
    };

    const rulesAccepted = safeProfile?.community_rules_accepted_at != null;
    const introPending = safeProfile?.intro_onboarding_dismissed_at == null;
    needsWelcomeOnboarding =
      !isBrowseOnlyProfileId(user.id) && (!rulesAccepted || introPending);
  }

  return (
    <div className="flex h-dvh max-h-dvh w-full max-w-full flex-col overflow-hidden lg:flex-row">
      <SkipToContent />
      <Sidebar user={sidebarUser} />
      <AppShellClient
        needsIntroOnboarding={needsWelcomeOnboarding}
        role={sidebarUser.role}
        userId={user?.id ?? null}
      >
        {children}
      </AppShellClient>
    </div>
  );
}
