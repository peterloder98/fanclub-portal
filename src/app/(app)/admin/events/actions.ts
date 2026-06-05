"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const noteSchema = z.object({
  eventId: z.string().uuid(),
  nextStation: z.string().max(500).optional().nullable(),
  nextHotel: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function saveEventAdminNote(input: {
  eventId: string;
  nextStation?: string | null;
  nextHotel?: string | null;
  notes?: string | null;
}) {
  const { user } = await requireAdminAction();
  const parsed = noteSchema.parse(input);
  const admin = createSupabaseAdminClient();

  const payload = {
    event_id: parsed.eventId,
    next_station: parsed.nextStation?.trim() || null,
    next_hotel: parsed.nextHotel?.trim() || null,
    notes: parsed.notes?.trim() || null,
    updated_by: user.id,
  };

  const { error } = await admin.from("event_admin_notes").upsert(payload, {
    onConflict: "event_id",
  });
  if (error) {
    if (/event_admin_notes|does not exist/i.test(error.message)) {
      throw new Error(
        "Vorstand-Notizen fehlen. Bitte supabase/053_event_admin_notes.sql im SQL Editor ausführen.",
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}

export async function clearEventAdminNote(eventId: string) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("event_admin_notes").delete().eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true };
}
