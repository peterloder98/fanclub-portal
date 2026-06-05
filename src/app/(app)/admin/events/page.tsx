import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import {
  EventAdminNotesPanel,
  type AdminEventRow,
} from "@/components/admin/event-admin-notes-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { eventAdminNotesByEventId, type EventAdminNote } from "@/lib/events/admin-notes";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
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

  const admin = createSupabaseAdminClient();
  const { data: events, error: evErr } = await admin
    .from("external_events")
    .select("id,title,start_at,venue,address,postal_code,city")
    .eq("is_visible", true)
    .order("start_at", { ascending: true, nullsFirst: false });

  if (evErr) throw new Error(evErr.message);

  const eventRows: AdminEventRow[] = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    venue: e.venue,
    address: e.address,
    postal_code: e.postal_code,
    city: e.city,
  }));

  let notesByEventId: Record<string, EventAdminNote> = {};
  let notesAvailable = true;

  try {
    const map = await eventAdminNotesByEventId(eventRows.map((e) => e.id));
    notesByEventId = Object.fromEntries(map);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/event_admin_notes|does not exist/i.test(msg)) {
      notesAvailable = false;
    } else {
      throw e;
    }
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Event-Infos (Vorstand)"
        subtitle="Nächster Bahnhof, Hotel und Notizen — nur für Admins sichtbar."
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink />
        <div className="mt-4">
          <EventAdminNotesPanel
            events={eventRows}
            notesByEventId={notesByEventId}
            notesAvailable={notesAvailable}
          />
        </div>
      </main>
    </div>
  );
}
