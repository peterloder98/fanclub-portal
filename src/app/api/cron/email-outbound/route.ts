import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { kickOutboundEmailDrain } from "@/lib/email/kick-outbound-drain";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Manuell / Kick nach Live-Enqueue / optional externer Cron:
 * ein Drain-Chunk (Throttling), bei Rest-Pending Selbst-Kette.
 * Tages-Crons rufen zusätzlich den Sidecar mit auf.
 */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await kickOutboundEmailDrain(admin);
  return NextResponse.json({ ok: true, ...result });
}
