import { Topbar } from "@/components/app-shell/topbar";
import {
  EventsInteractivePanel,
  type EventParticipationMeta,
} from "@/components/events/events-interactive-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import type { EventAdminNote } from "@/lib/events/admin-notes";
import { redirect } from "next/navigation";

export default async function EventsPage() {
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
    .select("id,title,start_at,venue,address,postal_code,city,ticket_url,lat,lng")
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

  let adminNotesByEventId: Record<string, EventAdminNote> | undefined;
  if (isAdmin && eventIds.length) {
    const { data: noteRows } = await supabase
      .from("event_admin_notes")
      .select("event_id,next_station,next_hotel,notes,updated_at")
      .in("event_id", eventIds);
    if (noteRows?.length) {
      adminNotesByEventId = Object.fromEntries(
        noteRows.map((r) => [
          r.event_id,
          {
            eventId: r.event_id,
            nextStation: r.next_station,
            nextHotel: r.next_hotel,
            notes: r.notes,
            updatedAt: r.updated_at,
          },
        ]),
      );
    }
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
      <Topbar
        title="Events"
        subtitle="Alle wichtigen Konzerttermine von Anni"
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 lg:px-6">
        {error ? (
          <div className="mb-3 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error.message.includes("external_events")
              ? "Tabelle fehlt noch. Bitte `supabase/006_artistflow_events.sql` ausführen."
              : error.message.includes("event_participations")
                ? "Bitte `supabase/035_event_participations.sql` ausführen."
                : error.message}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          <EventsInteractivePanel
            events={(events ?? []) as never[]}
            nextStartAt={nextEventWithDate?.start_at ?? null}
            nextTitle={nextEventWithDate?.title ?? null}
            participationByEventId={participationByEventId}
            adminNotesByEventId={adminNotesByEventId}
          />
        </div>
      </main>
    </div>
  );
}
