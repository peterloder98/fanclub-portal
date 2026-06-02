import { Topbar } from "@/components/app-shell/topbar";
import { EventsCountdown } from "@/components/events/events-countdown";
import { EventsInteractivePanel } from "@/components/events/events-interactive-panel.client";
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

          <EventsInteractivePanel events={(events ?? []) as any} />
        </div>
      </main>
    </div>
  );
}
