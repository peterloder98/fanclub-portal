import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLiveSessionReminders } from "@/lib/live/invites";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich: 1 Tag vor Live-Session Erinnerung nur an Zusagen. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runLiveSessionReminders(admin);
  return NextResponse.json({ ok: true, ...result });
}
