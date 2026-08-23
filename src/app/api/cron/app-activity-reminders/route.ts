import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runOutboundEmailDrainSidecar } from "@/lib/email/outbound-drain-sidecar";
import { runAppActivityReminders } from "@/lib/email/app-activity-reminders";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich: App-Anmelde-Erinnerung (7/14/21/28 Tage) und Inaktivität nach 30 Tagen. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const [result, outbound] = await Promise.all([
    runAppActivityReminders(admin),
    runOutboundEmailDrainSidecar(admin),
  ]);
  if (result.error) {
    return NextResponse.json({ ok: false, ...result, outboundEmail: outbound }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...result, outboundEmail: outbound });
}
