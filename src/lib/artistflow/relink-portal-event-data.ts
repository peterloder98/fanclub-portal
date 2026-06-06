import type { SupabaseClient } from "@supabase/supabase-js";
import { feedMatchKey } from "@/lib/artistflow/feed-match-key";

type EventRow = {
  id: string;
  title: string;
  start_at: string | null;
  city: string | null;
  kind: string | null;
  broadcaster: string | null;
  is_visible: boolean;
};

function matchKey(row: EventRow) {
  return feedMatchKey({
    kind: row.kind,
    title: row.title,
    start_at: row.start_at,
    city: row.city,
    broadcaster: row.broadcaster,
  });
}

/** Teilnahmen & Reiseinfos von versteckten Duplikaten auf sichtbares Event übertragen. */
export async function relinkOrphanedPortalEventData(admin: SupabaseClient) {
  const { data: events, error } = await admin
    .from("external_events")
    .select("id,title,start_at,city,kind,broadcaster,is_visible")
    .eq("source", "artistflow");
  if (error || !events?.length) {
    return { participationsMoved: 0, travelNotesMoved: 0 };
  }

  const rows: EventRow[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    city: e.city,
    kind: (e as { kind?: string }).kind ?? "event",
    broadcaster: (e as { broadcaster?: string | null }).broadcaster ?? null,
    is_visible: e.is_visible,
  }));

  const visibleByKey = new Map<string, string>();
  for (const e of rows) {
    if (!e.is_visible) continue;
    const key = matchKey(e);
    if (!visibleByKey.has(key)) visibleByKey.set(key, e.id);
  }

  let participationsMoved = 0;
  let travelNotesMoved = 0;

  for (const hidden of rows.filter((e) => !e.is_visible)) {
    const targetId = visibleByKey.get(matchKey(hidden));
    if (!targetId || targetId === hidden.id) continue;

    const { data: parts } = await admin
      .from("event_participations")
      .select("user_id")
      .eq("event_id", hidden.id);
    for (const p of parts ?? []) {
      const { error: insErr } = await admin.from("event_participations").insert({
        event_id: targetId,
        user_id: p.user_id,
      });
      if (!insErr) participationsMoved += 1;
      else if (!/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message);
    }
    await admin.from("event_participations").delete().eq("event_id", hidden.id);

    const { data: note } = await admin
      .from("event_admin_notes")
      .select("event_id,travel_info,updated_at,updated_by")
      .eq("event_id", hidden.id)
      .maybeSingle();
    if (note) {
      const { data: targetNote } = await admin
        .from("event_admin_notes")
        .select("event_id")
        .eq("event_id", targetId)
        .maybeSingle();
      if (!targetNote) {
        await admin.from("event_admin_notes").upsert({
          event_id: targetId,
          travel_info: note.travel_info,
          updated_at: note.updated_at,
          updated_by: note.updated_by,
        });
        travelNotesMoved += 1;
      }
      await admin.from("event_admin_notes").delete().eq("event_id", hidden.id);
    }
  }

  return { participationsMoved, travelNotesMoved };
}
