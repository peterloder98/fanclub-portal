import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runOutboundEmailDrainSidecar } from "@/lib/email/outbound-drain-sidecar";
import { runClubMeetingReminders } from "@/lib/notifications/meeting-reminders";
import { runLiveSessionCleanup } from "@/lib/live/cleanup";
import { runBirthdayPosts } from "@/lib/birthday/run-birthday-posts";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Täglich: Erinnerung 7 und 2 Tage vor Fanclub-Treffen — nur angemeldete Mitglieder.
 * Mitlaufend: Live-Cleanup + Geburtstags-Posts (idempotentes Backup, falls der
 * dedizierte Birthday-Cron morgens ausfällt).
 */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const [result, cleanup, birthday, outbound] = await Promise.all([
    runClubMeetingReminders(admin),
    runLiveSessionCleanup(admin),
    runBirthdayPosts(admin, { trigger: "meeting-reminders-backup" }),
    runOutboundEmailDrainSidecar(admin),
  ]);
  return NextResponse.json({
    ok: true,
    ...result,
    liveCleanup: cleanup,
    birthdayPosts: birthday,
    outboundEmail: outbound,
  });
}
