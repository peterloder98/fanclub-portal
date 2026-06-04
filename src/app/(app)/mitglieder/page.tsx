import { Topbar } from "@/components/app-shell/topbar";
import { MembersMap } from "@/components/members/members-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { geocodeGermanPlz, isGermanCountry } from "@/lib/members/geocode-plz";
import { clusterMemberPoints, type MemberMapPoint } from "@/lib/members/cluster-map";

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
        .select("id,first_name,last_name,postal_code,city,country")
        .in("id", activeList)
    : { data: [] };

  const plzCache = new Map<string, { lat: number; lng: number } | null>();
  const mapPoints: MemberMapPoint[] = [];

  for (const p of profiles ?? []) {
    const plz = (p.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
    const city = (p.city ?? "").trim();
    if (!plz || plz.length !== 5 || !isGermanCountry(p.country)) continue;

    const plzKey = `${plz}|${city}`;
    if (!plzCache.has(plzKey)) {
      plzCache.set(plzKey, await geocodeGermanPlz(plz, city));
    }
    const coords = plzCache.get(plzKey);
    if (!coords) continue;

    mapPoints.push({
      userId: p.id,
      postalCode: plz,
      city: city || "Deutschland",
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  const clusters = clusterMemberPoints(mapPoints, 20);

  let rows: LeaderRow[] = [];
  const { data: leaderboard, error: lbErr } = await supabase.rpc(
    "member_year_points_leaderboard",
    { p_limit: 30 },
  );
  if (!lbErr) rows = (leaderboard ?? []) as LeaderRow[];

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitglieder"
        subtitle="Wo wir herkommen — und wer die meisten Statuspunkte hat."
      />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,360px)] lg:items-stretch">
          <div className="flex min-h-[280px] flex-col rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm lg:min-h-[360px]">
            <h2 className="px-1 text-base font-semibold text-slate-900">Mitglieder in Deutschland</h2>
            <p className="mt-1 px-1 text-xs text-slate-600">
              Nur PLZ und Ort — keine Straßen. Mehrere in einer Stadt = größerer Pin. Nahe Orte
              werden als Region zusammengefasst (ca. 20 km).
            </p>
            <div className="mt-3 min-h-0 flex-1">
              <MembersMap clusters={clusters} />
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Statuspunkte-Rangliste</h2>
              <p className="text-xs text-slate-600">Aktuelles Kalenderjahr</p>
            </div>
            <ol className="max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain px-2 py-2">
              {rows.length === 0 ? (
                <li className="px-2 py-4 text-sm text-slate-500">Noch keine Punkte.</li>
              ) : (
                rows.map((r, i) => {
                  const name =
                    r.first_name && r.last_name
                      ? `${r.first_name} ${r.last_name}`
                      : "Mitglied";
                  return (
                    <li
                      key={r.user_id}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-slate-500">
                          {i + 1}.
                        </span>
                        <span className="truncate text-sm font-medium text-slate-900">{name}</span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 text-sm font-bold tabular-nums text-blue-800">
                        {r.points}
                      </span>
                    </li>
                  );
                })
              )}
            </ol>
          </aside>
        </section>
      </main>
    </div>
  );
}
