import { Topbar } from "@/components/app-shell/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { PostFeed } from "@/components/feed/post-feed";
import type { MapEvent } from "@/components/events/events-map";
import { EventsMap } from "@/components/events/events-map";
import { DashboardGiveawaysInline } from "@/components/giveaways/dashboard-giveaways-inline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadGiveawayListItems } from "@/lib/giveaways/load-list";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("external_events")
    .select("id,title,start_at,venue,address,postal_code,city,ticket_url,lat,lng")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false })
    .limit(50);

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

  let giveawayItems: Awaited<ReturnType<typeof loadGiveawayListItems>> = [];
  try {
    giveawayItems = await loadGiveawayListItems(user.id);
  } catch {
    giveawayItems = [];
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Dashboard"
        subtitle="Willkommen zurück — hier siehst du alles Wichtige auf einen Blick."
      />

      <main className="px-4 py-6 lg:px-6">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,280px)] lg:gap-4">
          <section className="min-w-0">
            <PostFeed embedPollsInFeed />
          </section>

          <aside className="flex max-h-[calc(100vh-5.5rem)] min-h-0 flex-col gap-2 lg:sticky lg:top-20">
            <Card className="flex min-h-[min(420px,52vh)] flex-1 flex-col overflow-hidden">
              <CardContent className="flex min-h-0 flex-1 p-1.5">
                <EventsMap events={mapEvents} minHeight={400} mapVariant="dashboard" />
              </CardContent>
            </Card>

            <Card className="flex max-h-[min(220px,28vh)] min-h-[100px] shrink-0 flex-col overflow-hidden">
              <CardContent className="flex min-h-0 flex-1 flex-col p-2">
                <DashboardGiveawaysInline items={giveawayItems} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
