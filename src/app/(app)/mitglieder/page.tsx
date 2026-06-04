import { Topbar } from "@/components/app-shell/topbar";
import { MembersLeaderboard } from "@/components/members/members-leaderboard";
import { MembersMap } from "@/components/members/members-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { geocodeProfileMapCoords, syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { isGermanCountry } from "@/lib/members/geocode-plz";
import type { MemberMapPoint } from "@/lib/members/cluster-map";
import { groupMembersByMapLocation, type MemberMapCluster } from "@/lib/members/cluster-map";
import { profileDisplayName } from "@/lib/profiles/display";

type LeaderRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  points: number;
};

export default async function MitgliederPage() {
  const supabase = await createSupabaseServerClient();

  const { data: activeMemberships } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const activeIds = new Set((activeMemberships ?? []).map((m) => m.user_id));

  const activeList = [...activeIds];
  const { data: profiles } = activeList.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,postal_code,city,country,map_lat,map_lng")
        .in("id", activeList)
    : { data: [] };

  const admin = createSupabaseAdminClient();
  const mapPoints: MemberMapPoint[] = [];

  for (const p of profiles ?? []) {
    const plz = (p.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
    const city = (p.city ?? "").trim();
    if (!plz || plz.length !== 5 || !isGermanCountry(p.country)) continue;

    let lat = typeof p.map_lat === "number" ? p.map_lat : null;
    let lng = typeof p.map_lng === "number" ? p.map_lng : null;

    if (lat == null || lng == null) {
      const coords =
        (await geocodeProfileMapCoords(p)) ??
        (await syncProfileMapCoords(admin, p.id).then((r) =>
          r.ok && r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
        ));
      if (!coords) continue;
      lat = coords.lat;
      lng = coords.lng;
    }

    mapPoints.push({
      userId: p.id,
      postalCode: plz,
      city: city || "Deutschland",
      lat,
      lng,
    });
  }

  const clusters: MemberMapCluster[] = groupMembersByMapLocation(mapPoints);

  let rows: LeaderRow[] = [];
  const { data: leaderboard, error: lbErr } = await supabase.rpc(
    "member_year_points_leaderboard",
    { p_limit: 30 },
  );
  if (!lbErr) rows = (leaderboard ?? []) as LeaderRow[];

  const leaderboardUserIds = rows.map((r) => r.user_id);
  const { data: leaderboardProfiles } = leaderboardUserIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,email,avatar_path,updated_at")
        .in("id", leaderboardUserIds)
    : { data: [] };
  const profileById = new Map((leaderboardProfiles ?? []).map((p) => [p.id, p]));

  const leaderboardRows = rows.map((r) => {
    const p = profileById.get(r.user_id);
    const name = p
      ? profileDisplayName(p)
      : r.first_name && r.last_name
        ? `${r.first_name} ${r.last_name}`
        : "Mitglied";
    return {
      userId: r.user_id,
      name,
      points: Number(r.points),
      avatarUrl: p ? getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null) : null,
    };
  });

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitglieder"
        subtitle="Wo wir herkommen — und wer die meisten Statuspunkte hat."
      />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,360px)] lg:items-stretch">
          <div className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm lg:min-h-[520px]">
            <h2 className="px-1 text-base font-semibold text-slate-900">Hier sind unsere Mitglieder her</h2>
            <p className="mt-1 px-1 text-xs text-slate-600">
              In diesen Bereichen sind unsere Mitglieder zu Hause (keine persönlichen Adressen, nur
              regionale Einordnung!).
            </p>
            <div className="mt-3 min-h-0 flex-1">
              <MembersMap clusters={clusters} memberCount={mapPoints.length} />
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Statuspunkte-Rangliste</h2>
              <p className="text-xs text-slate-600">Aktuelles Kalenderjahr</p>
            </div>
            <ol className="max-h-[min(520px,58vh)] overflow-y-auto overscroll-contain px-2 py-2">
              <MembersLeaderboard rows={leaderboardRows} />
            </ol>
          </aside>
        </section>
      </main>
    </div>
  );
}
