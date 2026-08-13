import type { SupabaseClient } from "@supabase/supabase-js";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { memberCountryLabel } from "@/lib/members/country";
import { formatMemberOrigin } from "@/lib/members/intro-questions";
import { excludeHiddenProfiles } from "@/lib/members/hidden";
import { profileDisplayName } from "@/lib/profiles/display";

export type RecentMemberWelcome = {
  userId: string;
  name: string;
  origin: string | null;
  avatarUrl: string | null;
  /** true wenn die Person die App schon genutzt hat → Profil-Link anzeigen */
  hasRegistered: boolean;
  startDate: string | null;
};

export async function loadRecentWelcomeMembers(
  supabase: SupabaseClient,
  limit = 3,
): Promise<RecentMemberWelcome[]> {
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("user_id,start_date")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(Math.max(limit * 3, 12));

  if (error || !memberships?.length) return [];

  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,email,city,country,avatar_path,updated_at,last_app_active_at",
    )
    .in("id", userIds);

  const byId = new Map(excludeHiddenProfiles(profiles).map((p) => [p.id, p]));
  const out: RecentMemberWelcome[] = [];

  for (const m of memberships) {
    const p = byId.get(m.user_id);
    if (!p) continue;
    const name = profileDisplayName(p);
    if (!name || name === "Mitglied") continue;

    out.push({
      userId: p.id,
      name,
      origin: formatMemberOrigin({
        city: p.city,
        countryLabel: memberCountryLabel(p.country),
      }),
      avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null),
      hasRegistered: Boolean(p.last_app_active_at),
      startDate: m.start_date ?? null,
    });

    if (out.length >= limit) break;
  }

  return out;
}
