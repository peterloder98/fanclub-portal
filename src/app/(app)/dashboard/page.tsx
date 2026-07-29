import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { PostFeed } from "@/components/feed/post-feed";
import type { MapEvent } from "@/components/events/events-map";
import { DashboardEventsMapCard } from "@/components/dashboard/dashboard-events-map-card.client";
import { EventsCountdown } from "@/components/events/events-countdown";
import { pickNextEvent } from "@/lib/events/pick-next-event";
import { filterVisibleEvents } from "@/lib/events/event-schedule";
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

  let { data: events } = await supabase
    .from("external_events")
    .select("id,kind,title,start_at,end_at,venue,address,postal_code,city,country,broadcaster,ticket_url,lat,lng")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(50);

  if (!events) {
    const fallback = await supabase
      .from("external_events")
      .select("id,kind,title,start_at,venue,address,postal_code,city,country,broadcaster,ticket_url,lat,lng")
      .eq("is_visible", true)
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(50);
    events = (fallback.data ?? []).map((e) => ({ ...e, end_at: null }));
  }

  const allEvents = (events ?? []).map((e) => ({
    ...e,
    end_at: (e as { end_at?: string | null }).end_at ?? null,
  }));
  const visibleEvents = filterVisibleEvents(allEvents);
  const nextEvent = pickNextEvent(allEvents);

  const eventIds = visibleEvents.map((e) => e.id);
  const participationByEventId: Record<
    string,
    { count: number; attendees: { id: string; name: string; avatarUrl: string | null }[] }
  > = {};

  if (eventIds.length) {
    const { data: parts } = await supabase
      .from("event_participations")
      .select("event_id,user_id")
      .in("event_id", eventIds);
    const byEvent = new Map<string, string[]>();
    (parts ?? []).forEach((p) => {
      if (!byEvent.has(p.event_id)) byEvent.set(p.event_id, []);
      byEvent.get(p.event_id)!.push(p.user_id);
    });
    const allUserIds = Array.from(new Set((parts ?? []).map((p) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", allUserIds.length ? allUserIds : ["00000000-0000-0000-0000-000000000000"]);
    const { getAvatarPublicUrl } = await import("@/lib/avatars/url");
    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          id: p.id,
          name:
            p.first_name && p.last_name
              ? `${p.first_name} ${p.last_name}`
              : (p.email ?? "Mitglied"),
          avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
        },
      ]),
    );
    for (const eid of eventIds) {
      const uids = byEvent.get(eid) ?? [];
      participationByEventId[eid] = {
        count: uids.length,
        attendees: uids
          .map((uid) => profileMap.get(uid))
          .filter((x): x is NonNullable<typeof x> => Boolean(x)),
      };
    }
  }

  const mapEvents: MapEvent[] = visibleEvents.map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    end_at: e.end_at ?? null,
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
    participationCount: participationByEventId[e.id]?.count ?? 0,
    participationAttendees: participationByEventId[e.id]?.attendees ?? [],
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
    <div className="min-h-screen min-w-0 w-full max-w-full overflow-x-clip">
      <Topbar
        title="Dashboard"
        subtitle="Willkommen zurück — hier siehst du alles Wichtige auf einen Blick."
      />

      <main className="min-w-0 w-full max-w-full py-4 pb-2 lg:py-4 lg:pb-0">
        {nextMeeting ? <DashboardMeetingHighlight meeting={nextMeeting} /> : null}
        {/* Mobile: Nächster Auftritt ganz oben */}
        <div className="mb-4 lg:hidden">
          <EventsCountdown
            compact
            nextStartAt={nextEvent?.start_at ?? null}
            nextTitle={nextEvent?.title ?? null}
          />
        </div>
        <div className="grid min-w-0 max-w-full items-stretch gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,320px)] lg:gap-4 lg:min-h-[calc(100dvh-4rem-1rem)]">
          <section className="min-w-0 max-w-full">
            <PostFeed embedPollsInFeed />
          </section>

          <aside className="flex min-w-0 max-w-full flex-col gap-1.5 lg:sticky lg:top-0 lg:h-[calc(100dvh-4rem-1rem)] lg:max-h-[calc(100dvh-4rem-1rem)]">
            <div className="hidden shrink-0 lg:block">
              <EventsCountdown
                compact
                nextStartAt={nextEvent?.start_at ?? null}
                nextTitle={nextEvent?.title ?? null}
              />
            </div>

            <DashboardEventsMapCard events={mapEvents} />

            <Card className="flex h-[13rem] shrink-0 flex-col overflow-hidden">
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
