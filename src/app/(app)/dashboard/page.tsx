import { Topbar } from "@/components/app-shell/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostFeed } from "@/components/feed/post-feed";
import { EventsCountdown } from "@/components/events/events-countdown";
import type { MapEvent } from "@/components/events/events-map";
import { EventsMap } from "@/components/events/events-map";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Gift } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase
    .from("external_events")
    .select("id,title,start_at,venue,address,postal_code,city,ticket_url,lat,lng")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(50);

  const nextEventWithDate = (events ?? []).find((e) => Boolean(e.start_at)) ?? null;

  const mapEvents: MapEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    ticket_url: e.ticket_url,
    venue: e.venue ?? null,
    address: e.address ?? null,
    postal_code: (e as { postal_code?: string }).postal_code ?? null,
    city: e.city ?? null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
  }));

  return (
    <div className="min-h-screen">
      <Topbar
        title="Dashboard"
        subtitle="Willkommen zurück — hier siehst du alles Wichtige auf einen Blick."
      />

      <main className="px-4 py-6 lg:px-6">
        <div
          className="grid gap-5 items-start"
          style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
        >
          <section>
            <PostFeed embedPollsInFeed />
          </section>

          <section className="grid gap-4 sticky top-24 self-start">
            <EventsCountdown
              compact
              nextStartAt={nextEventWithDate?.start_at ?? null}
              nextTitle={nextEventWithDate?.title ?? null}
            />

            <Card className="overflow-hidden">
              <CardContent className="p-3">
                <div className="h-[320px] min-h-[320px]">
                  <EventsMap events={mapEvents} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-slate-600" />
                  <CardTitle className="text-base">Gewinnspiel</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="rounded-2xl border bg-white p-4 text-sm shadow-sm shadow-slate-900/5">
                  <div className="font-semibold text-slate-900">Gewinnspiele</div>
                  <div className="mt-1 text-slate-600">
                    Aktive Gewinnspiele – Teilnahme für aktive Mitglieder.
                  </div>
                  <div className="mt-3">
                    <a
                      href="/giveaways"
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Zu den Gewinnspielen →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
