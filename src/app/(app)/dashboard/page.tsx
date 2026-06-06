import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { PostFeed } from "@/components/feed/post-feed";
import type { MapEvent } from "@/components/events/events-map";
import { EventsMap } from "@/components/events/events-map";
import { EventsCountdown } from "@/components/events/events-countdown";
import { pickNextEvent } from "@/lib/events/pick-next-event";
import { DashboardGiveawaysInline } from "@/components/giveaways/dashboard-giveaways-inline";
import { DashboardMeetingHighlight } from "@/components/meetings/dashboard-meeting-highlight";
import { loadPublishedMeetings, pickNextMeeting } from "@/lib/meetings/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadGiveawayListItems } from "@/lib/giveaways/load-list";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { maybeSyncArtistflowIfStale } from "@/lib/artistflow/maybe-sync-if-stale";

export default async function DashboardPage() {
  after(() => maybeSyncArtistflowIfStale());

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("external_events")
    .select("id,kind,title,start_at,venue,address,postal_code,city,country,broadcaster,ticket_url,lat,lng")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(50);

  const nextEvent = pickNextEvent(events ?? []);

  const mapEvents: MapEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    ticket_url: e.ticket_url,
    venue: e.venue ?? null,
    address: e.address ?? null,
    postal_code: (e as { postal_code?: string }).postal_code ?? null,
    city: e.city ?? null,
    country: (e as { country?: string }).country ?? null,
    broadcaster: (e as { broadcaster?: string }).broadcaster ?? null,
    kind: (e as { kind?: string }).kind ?? "event",
    lat: e.lat ?? null,
    lng: e.lng ?? null,
  }));

  let giveawayItems: Awaited<ReturnType<typeof loadGiveawayListItems>> = [];
  try {
    giveawayItems = await loadGiveawayListItems(user.id, "newest");
  } catch {
    giveawayItems = [];
  }

  let nextMeeting: Awaited<ReturnType<typeof pickNextMeeting>> = null;
  try {
    const meetings = await loadPublishedMeetings(supabase, user.id);
    nextMeeting = pickNextMeeting(meetings);
  } catch {
    nextMeeting = null;
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Dashboard"
        subtitle="Willkommen zurück — hier siehst du alles Wichtige auf einen Blick."
      />

      <main className="px-4 py-4 pb-2 lg:px-6 lg:py-4 lg:pb-0">
        {nextMeeting ? <DashboardMeetingHighlight meeting={nextMeeting} /> : null}
        {/* Mobile: Nächster Auftritt ganz oben */}
        <div className="mb-4 lg:hidden">
          <EventsCountdown
            compact
            nextStartAt={nextEvent?.start_at ?? null}
            nextTitle={nextEvent?.title ?? null}
          />
        </div>
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,280px)] lg:gap-4 lg:min-h-[calc(100dvh-4rem-1rem)]">
          <section className="min-w-0">
            <PostFeed embedPollsInFeed />
          </section>

          <aside className="flex min-h-0 flex-col gap-1.5 lg:sticky lg:top-0 lg:h-[calc(100dvh-4rem-1rem)] lg:max-h-[calc(100dvh-4rem-1rem)]">
            <div className="hidden shrink-0 lg:block">
              <EventsCountdown
                compact
                nextStartAt={nextEvent?.start_at ?? null}
                nextTitle={nextEvent?.title ?? null}
              />
            </div>

            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardContent className="flex h-full min-h-0 flex-1 flex-col p-1">
                <EventsMap
                  events={mapEvents}
                  minHeight={180}
                  mapVariant="dashboard"
                  fillHeight
                />
              </CardContent>
            </Card>

            <Card className="mt-auto flex max-h-[min(38vh,280px)] shrink-0 flex-col overflow-hidden">
              <CardContent className="flex min-h-0 flex-1 flex-col p-2 pb-2">
                <DashboardGiveawaysInline items={giveawayItems} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
