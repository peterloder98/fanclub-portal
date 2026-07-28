import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runNewYearContributionEmails } from "@/lib/membership/run-new-year-contribution-emails";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Jährlich 27.12., 09:00 Europe/Berlin: Info zum Beitrag für das kommende Kalenderjahr. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await runNewYearContributionEmails(admin, { force });
  return NextResponse.json({ ok: true, ...result });
}
