import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EventAdminNote = {
  eventId: string;
  nextStation: string | null;
  nextHotel: string | null;
  notes: string | null;
  updatedAt: string | null;
};

export async function listEventAdminNotes(): Promise<EventAdminNote[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("event_admin_notes")
    .select("event_id,next_station,next_hotel,notes,updated_at");
  if (error) {
    if (/event_admin_notes|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => ({
    eventId: r.event_id,
    nextStation: r.next_station,
    nextHotel: r.next_hotel,
    notes: r.notes,
    updatedAt: r.updated_at,
  }));
}

export async function eventAdminNotesByEventId(
  eventIds: string[],
): Promise<Map<string, EventAdminNote>> {
  if (!eventIds.length) return new Map();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("event_admin_notes")
    .select("event_id,next_station,next_hotel,notes,updated_at")
    .in("event_id", eventIds);
  if (error) {
    if (/event_admin_notes|does not exist/i.test(error.message)) return new Map();
    throw new Error(error.message);
  }
  const map = new Map<string, EventAdminNote>();
  for (const r of data ?? []) {
    map.set(r.event_id, {
      eventId: r.event_id,
      nextStation: r.next_station,
      nextHotel: r.next_hotel,
      notes: r.notes,
      updatedAt: r.updated_at,
    });
  }
  return map;
}
