import { Topbar } from "@/components/app-shell/topbar";
import { MembersMap } from "@/components/members/members-map";
import { UpcomingBirthdays } from "@/components/members/upcoming-birthdays";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { geocodeProfileMapCoords, syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { isGermanCountry } from "@/lib/members/geocode-plz";
import type { MemberMapPoint } from "@/lib/members/cluster-map";
import { groupMembersByMapLocation, type MemberMapCluster } from "@/lib/members/cluster-map";
import { profileDisplayName } from "@/lib/profiles/display";
import { buildUpcomingBirthdays } from "@/lib/members/upcoming-birthdays";

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
        .select(
          "id,first_name,last_name,postal_code,city,country,map_lat,map_lng,birthdate,avatar_path,updated_at,email",
        )
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

  const birthdayRows = buildUpcomingBirthdays(
    (profiles ?? []).map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      birthdate: p.birthdate,
      name: profileDisplayName(p),
      avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null),
    })),
    10,
  );

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitglieder"
        subtitle="Wo wir herkommen — und wer als Nächstes Geburtstag hat."
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

          <aside className="flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Nächste Geburtstage</h2>
              <p className="text-xs text-slate-600">Die nächsten 10 Termine im Jahr</p>
            </div>
            <div className="max-h-[min(520px,58vh)] overflow-y-auto overscroll-contain">
              <UpcomingBirthdays rows={birthdayRows} />
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
