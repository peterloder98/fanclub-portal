"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function setLiveSessionRsvpAction(
  sessionId: string,
  status: "accepted" | "declined",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id,status,slug")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session nicht gefunden." };
  if (session.status === "ended" || session.status === "cancelled") {
    return { ok: false, error: "Diese Session ist beendet." };
  }

  const { error } = await supabase.from("live_session_rsvps").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      status,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/live/${session.slug}`);
  revalidatePath("/live");
  revalidatePath("/dashboard");
  return { ok: true };
}
