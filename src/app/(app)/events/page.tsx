import { Topbar } from "@/components/app-shell/topbar";
import {
  EventsInteractivePanel,
  type EventParticipationMeta,
} from "@/components/events/events-interactive-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { parseTravelInfo, type EventTravelNoteRow } from "@/lib/events/travel-info";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { maybeSyncArtistflowIfStale } from "@/lib/artistflow/maybe-sync-if-stale";

export default async function EventsPage() {
  after(() => maybeSyncArtistflowIfStale());

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  const { data: events, error } = await supabase
    .from("external_events")
    .select("id,kind,title,start_at,venue,address,postal_code,city,country,broadcaster,ticket_url,lat,lng")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false });

  const nextEventWithDate =
    (events ?? []).find((e) => Boolean(e.start_at)) ?? null;

  const eventIds = (events ?? []).map((e) => e.id);
  const participationByEventId: Record<string, EventParticipationMeta> = {};

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
      const userIds = byEvent.get(eid) ?? [];
      participationByEventId[eid] = {
        count: userIds.length,
        joined: userIds.includes(user.id),
        attendees: userIds
          .map((uid) => profileMap.get(uid))
          .filter((x): x is NonNullable<typeof x> => Boolean(x)),
      };
    }
  }

  let travelNotesByEventId: Record<string, EventTravelNoteRow> = {};
  if (eventIds.length) {
    const { data: noteRows } = await supabase
      .from("event_admin_notes")
      .select("event_id,travel_info,updated_at")
      .in("event_id", eventIds);
    if (noteRows?.length) {
      travelNotesByEventId = Object.fromEntries(
        noteRows.map((r) => [
          r.event_id,
          {
            eventId: r.event_id,
            travel: parseTravelInfo(
              (r as { travel_info?: unknown }).travel_info ??
                (r as { next_station?: string | null }).next_station,
            ),
            updatedAt: r.updated_at,
          },
        ]),
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-dvh lg:max-h-dvh lg:overflow-hidden">
      <Topbar
        title="Events"
        subtitle="Konzerte und TV-Auftritte von Anni"
      />
      <main className="flex flex-col px-4 py-3 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-6">
        {error ? (
          <div className="mb-3 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error.message.includes("external_events")
              ? "Tabelle fehlt noch. Bitte `supabase/006_artistflow_events.sql` ausführen."
              : error.message.includes("event_participations")
                ? "Bitte `supabase/035_event_participations.sql` ausführen."
                : error.message}
          </div>
        ) : null}

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <EventsInteractivePanel
            events={(events ?? []) as never[]}
            nextStartAt={nextEventWithDate?.start_at ?? null}
            nextTitle={nextEventWithDate?.title ?? null}
            participationByEventId={participationByEventId}
            travelNotesByEventId={travelNotesByEventId}
            isAdmin={isAdmin}
          />
        </div>
      </main>
    </div>
  );
}
