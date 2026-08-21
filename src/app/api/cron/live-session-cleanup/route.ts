import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLiveSessionCleanup } from "@/lib/live/cleanup";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Alle 5 Min.: abgelaufene Lives → Grace, Grace vorbei → löschen (+ LiveKit-Raum). */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runLiveSessionCleanup(admin);
  return NextResponse.json({ ok: true, ...result });
}
