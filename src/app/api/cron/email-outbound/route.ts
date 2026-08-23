import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { drainOutboundEmailQueue } from "@/lib/email/outbound-queue";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Manuell oder extern (z. B. cron-job.org): bis zu N Mails aus der Warteschlange. Tages-Crons rufen den Sidecar mit auf. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await drainOutboundEmailQueue(admin);
  return NextResponse.json({ ok: true, ...result });
}
