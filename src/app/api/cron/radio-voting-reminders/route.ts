import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runRadioVotingLastChanceReminders } from "@/lib/notifications/radio-voting-reminders";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich morgens: Letzte-Chance-Erinnerung für Radio-Votings am Endtag. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runRadioVotingLastChanceReminders(admin);
  return NextResponse.json({ ok: true, ...result });
}
