"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enrichTravelPlace } from "@/lib/events/route-distance";
import {
  normalizeTravelInput,
  type TravelInfoInput,
} from "@/lib/events/travel-info";

const placeSchema = z.object({
  name: z.string().max(200),
  address: z.string().max(500),
  link: z.string().max(500).optional().nullable(),
});

const travelSchema = z.object({
  eventId: z.string().uuid(),
  travel: z.object({
    station: placeSchema.nullable(),
    hotels: z.array(placeSchema).max(3),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export async function saveEventTravelInfo(input: {
  eventId: string;
  travel: TravelInfoInput;
}) {
  const { user } = await requireAdminAction();
  const parsed = travelSchema.parse(input);
  const admin = createSupabaseAdminClient();

  const { data: event } = await admin
    .from("external_events")
    .select("lat,lng")
    .eq("id", parsed.eventId)
    .maybeSingle();

  const venue =
    event?.lat != null && event?.lng != null
      ? { lat: event.lat as number, lng: event.lng as number }
      : null;

  const normalized = normalizeTravelInput(parsed.travel);

  const station = normalized.station
    ? await enrichTravelPlace(normalized.station, venue)
    : null;

  const hotels = await Promise.all(
    normalized.hotels.map((h) => enrichTravelPlace(h, venue)),
  );

  const travelInfo = {
    station,
    hotels,
    notes: normalized.notes,
  };

  const { error } = await admin.from("event_admin_notes").upsert(
    {
      event_id: parsed.eventId,
      travel_info: travelInfo,
      updated_by: user.id,
    },
    { onConflict: "event_id" },
  );

  if (error) {
    if (/event_admin_notes|does not exist/i.test(error.message)) {
      throw new Error(
        "Event-Infos fehlen. Bitte supabase/053 und 055_event_travel_info.sql ausführen.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/events");
  return { ok: true };
}

export async function clearEventTravelInfo(eventId: string) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("event_admin_notes").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  return { ok: true };
}
