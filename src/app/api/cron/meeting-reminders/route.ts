import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runClubMeetingReminders } from "@/lib/notifications/meeting-reminders";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich: Erinnerung 7 und 2 Tage vor Fanclub-Treffen — nur angemeldete Mitglieder. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runClubMeetingReminders(admin);
  return NextResponse.json({ ok: true, ...result });
}
