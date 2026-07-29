import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runReferralAbuseScan } from "@/lib/membership/referral-abuse";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich: auffällige Empfehlungs-Muster mit Grace-Zeit prüfen. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runReferralAbuseScan(admin);
  return NextResponse.json({ ok: true, ...result });
}
