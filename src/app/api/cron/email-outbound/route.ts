import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { acceptOutboundDrainInBackground } from "@/lib/email/kick-outbound-drain";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Manuell / Kick nach Live-Enqueue / optional externer Cron.
 * Antwortet sofort (kein Gateway-504); Drain läuft gedrosselt im after()-Hintergrund
 * und kettet bei Rest-Pending selbst weiter.
 */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  acceptOutboundDrainInBackground(admin);
  return NextResponse.json({ ok: true, accepted: true });
}
