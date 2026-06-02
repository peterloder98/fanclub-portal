import { Topbar } from "@/components/app-shell/topbar";
import { EventsCountdown } from "@/components/events/events-countdown";
import type { MapEvent } from "@/components/events/events-map";
import { EventsMap } from "@/components/events/events-map";
import { EventsRows } from "@/components/events/events-rows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EventsPage() {
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

  const { data: events, error } = await supabase
    .from("external_events")
    .select("id,title,start_at,venue,address,postal_code,city,ticket_url,lat,lng")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false });

  const mapEvents: MapEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    ticket_url: e.ticket_url,
    venue: e.venue ?? null,
    address: e.address ?? null,
    postal_code: (e as any).postal_code ?? null,
    city: e.city ?? null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
  }));

  const nextEventWithDate =
    (events ?? []).find((e) => Boolean(e.start_at)) ?? null;

  return (
    <div className="min-h-screen">
      <Topbar
        title="Events"
        subtitle="Konzerttermine aus Artistflow (automatisch synchronisiert)."
      />
      {/* Fixed viewport content area under the sticky topbar */}
      <main className="h-[calc(100vh-64px)] overflow-hidden px-4 py-5 lg:px-6">
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error.message.includes("external_events")
              ? "Tabelle fehlt noch. Bitte `supabase/006_artistflow_events.sql` in Supabase ausführen."
              : error.message}
          </div>
        ) : null}

        <div className="flex h-full min-h-0 flex-col gap-4">
          <EventsCountdown
            nextStartAt={nextEventWithDate?.start_at ?? null}
            nextTitle={nextEventWithDate?.title ?? null}
          />

          {/* Fixed 2-column layout (desktop-first): list left, map right */}
          <div
            className="grid min-h-0 flex-1 items-stretch gap-5"
            style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
          >
            <Card className="min-w-0 min-h-0 h-full overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle>Alle Termine</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 pb-3">
                <div className="h-full overflow-y-auto pr-1">
                  <EventsRows events={(events ?? []) as any} />
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-0 h-full overflow-hidden flex flex-col">
              <CardContent className="min-h-0 flex-1 p-3">
                <div className="h-full">
                  <EventsMap events={mapEvents} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
