import type { SupabaseClient } from "@supabase/supabase-js";
import { postSyncPortalEvents } from "@/lib/artistflow/post-sync-portal-events";

/**
 * Verknüpft verwaiste Teilnahmen/Reiseinfos und aktualisiert Karten-Pins.
 * Blendet keine Events aus und führt keine Duplikat-Zusammenführung durch.
 */
export async function repairPortalEventData(admin: SupabaseClient) {
  const result = await postSyncPortalEvents(admin);
  return {
    groupsMerged: 0,
    eventsHidden: 0,
    participationsMoved: result.participationsMoved,
    travelNotesMoved: result.travelNotesMoved,
    geocoded: result.geocoded,
    pinsRestored: result.pinsRestored,
  };
}
