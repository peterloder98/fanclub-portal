import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseTravelInfo,
  type EventTravelInfo,
  type EventTravelNoteRow,
} from "@/lib/events/travel-info";

export type { EventTravelInfo, EventTravelNoteRow };

/** @deprecated use EventTravelNoteRow */
export type EventAdminNote = {
  eventId: string;
  travel: EventTravelInfo;
  updatedAt: string | null;
};

export async function eventTravelNotesByEventId(
  eventIds: string[],
): Promise<Map<string, EventTravelNoteRow>> {
  if (!eventIds.length) return new Map();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("event_admin_notes")
    .select("event_id,travel_info,updated_at")
    .in("event_id", eventIds);
  if (error) {
    if (/event_admin_notes|does not exist/i.test(error.message)) return new Map();
    throw new Error(error.message);
  }
  const map = new Map<string, EventTravelNoteRow>();
  for (const r of data ?? []) {
    map.set(r.event_id, {
      eventId: r.event_id,
      travel: parseTravelInfo(r.travel_info),
      updatedAt: r.updated_at,
    });
  }
  return map;
}
