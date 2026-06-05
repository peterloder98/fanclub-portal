import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { runArtistflowGeocodeBackfill, runArtistflowSync } from "./actions";

const STUCK_SYNC_MS = 3 * 60 * 1000;

export default async function AdminEventsSyncPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; geocoded?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const { data: lastLog } = await supabase
    .from("artistflow_sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isStuck =
    lastLog?.started_at &&
    !lastLog.finished_at &&
    Date.now() - new Date(lastLog.started_at).getTime() > STUCK_SYNC_MS;

  return (
    <div className="min-h-screen">
      <Topbar
        title="Artistflow Sync"
        subtitle="termine.json → external_events inkl. Geocoding"
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />

        {params.error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Sync fehlgeschlagen: {decodeURIComponent(params.error)}
          </div>
        ) : null}
        {params.ok ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {params.geocoded
              ? `Karten-Pins aktualisiert (${params.geocoded} neu geocodiert).`
              : "Sync erfolgreich abgeschlossen."}
          </div>
        ) : null}
        {isStuck ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Der letzte Sync wirkt hängengeblieben (läuft seit über 3 Minuten). Beim nächsten Klick
            auf „Sync starten“ wird er automatisch als abgebrochen markiert und neu gestartet.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sync jetzt ausführen</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              <div className="grid gap-2">
                <form action={runArtistflowSync}>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 hover:bg-slate-800"
                  >
                    Sync starten
                  </button>
                </form>
                <form action={runArtistflowGeocodeBackfill}>
                  <button
                    type="submit"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                  >
                    Karten-Pins nachholen
                  </button>
                </form>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Unveränderte Events werden nicht überschrieben. Teilnahmen und Reiseinfos bleiben
                erhalten — nur bei Terminänderung werden Teilnehmer zurückgesetzt. Pins bleiben
                ohne Adressänderung erhalten.
              </p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p>
                  Feed URL kommt aus <span className="font-mono">ARTISTFLOW_FEED_URL</span>{" "}
                  (z. B. Supabase Storage <span className="font-mono">termine.json</span>).
                </p>
                <p>
                  <span className="font-medium text-slate-800">Automatisch:</span> Vercel-Cron
                  alle 2 Stunden (<span className="font-mono">/api/cron/artistflow-sync</span>)
                  sowie Hintergrund-Sync auf Dashboard/Events, wenn der letzte Lauf älter als 2
                  Stunden ist.
                </p>
                <p>
                  <span className="font-medium text-slate-800">Voraussetzungen in Vercel:</span>{" "}
                  <span className="font-mono">ARTISTFLOW_FEED_URL</span> und{" "}
                  <span className="font-mono">CRON_SECRET</span> gesetzt. Auf dem Vercel-Hobby-Plan
                  sind Cron-Jobs auf einmal täglich begrenzt — dann „Sync starten“ oder Seite neu
                  laden (Hintergrund-Sync).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Letzter Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-700">
              {lastLog ? (
                <div className="grid gap-2">
                  <div>
                    <span className="font-medium">Start:</span>{" "}
                    {new Date(lastLog.started_at).toLocaleString("de-DE")}
                  </div>
                  <div>
                    <span className="font-medium">Ende:</span>{" "}
                    {lastLog.finished_at
                      ? new Date(lastLog.finished_at).toLocaleString("de-DE")
                      : "läuft…"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="neutral">total: {lastLog.total}</Badge>
                    <Badge variant="success">inserted: {lastLog.inserted}</Badge>
                    <Badge variant="brand">updated: {lastLog.updated}</Badge>
                    <Badge variant="warning">hidden: {lastLog.hidden}</Badge>
                    <Badge variant="neutral">
                      geocoded: {lastLog.geocoding_queued}
                    </Badge>
                  </div>
                  {lastLog.error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                      {lastLog.error}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-slate-600">Noch kein Sync gelaufen.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

