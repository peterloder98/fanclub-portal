import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLiveSessionCleanup } from "@/lib/live/cleanup";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich 04:20 (+ Piggyback in anderen Tages-Crons): Grace starten / löschen (+ LiveKit-Raum).
 *  Hinweis: Vercel Hobby erlaubt keine Minuten-Crons — Live-Ende/Grace laufen zusätzlich on-request und per Member-Polling. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runLiveSessionCleanup(admin);
  return NextResponse.json({ ok: true, ...result });
}
