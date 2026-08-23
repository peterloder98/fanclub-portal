import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runOutboundEmailDrainSidecar } from "@/lib/email/outbound-drain-sidecar";
import { runIntroSteckbriefReminders } from "@/lib/notifications/intro-reminders";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich: Steckbrief-Erinnerung nach 7 und 14 Tagen Mitgliedschaft. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const [result, outbound] = await Promise.all([
    runIntroSteckbriefReminders(admin),
    runOutboundEmailDrainSidecar(admin),
  ]);
  return NextResponse.json({ ok: true, ...result, outboundEmail: outbound });
}
