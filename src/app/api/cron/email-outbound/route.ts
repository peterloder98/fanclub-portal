import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { drainOutboundEmailQueue } from "@/lib/email/outbound-queue";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Alle 3 Minuten: bis zu N Mails aus der Warteschlange (gedrosselt). */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await drainOutboundEmailQueue(admin);
  return NextResponse.json({ ok: true, ...result });
}
