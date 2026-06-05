import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runEventParticipationReminders } from "@/lib/notifications/event-reminders";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich: Erinnerung 7 und 2 Tage vor Event für Teilnehmer. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runEventParticipationReminders(admin);
  return NextResponse.json({ ok: true, ...result });
}
