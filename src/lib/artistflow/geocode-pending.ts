import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeAllPendingArtistflowEvents } from "@/lib/artistflow/geocode-event";

/** @deprecated Nutze geocodeAllPendingArtistflowEvents */
export async function geocodePendingArtistflowEvents(
  admin: SupabaseClient,
  { limit = 8 }: { limit?: number } = {},
): Promise<number> {
  return geocodeAllPendingArtistflowEvents(admin, { maxEvents: limit });
}
