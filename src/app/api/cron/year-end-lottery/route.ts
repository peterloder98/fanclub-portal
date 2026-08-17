import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createYearEndGiveaway,
  defaultPointsYearForYearEndRun,
  findYearEndGiveawayForYear,
} from "@/lib/giveaways/year-end-lottery";
import { freezePointsYear } from "@/lib/points/year-archive";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Täglich im Januar: Vorjahr einfrieren (Archiv) und Top-10-Gewinnspiel anlegen,
 * falls noch nicht vorhanden. Auslosung bleibt manuell.
 */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const pointsYear = defaultPointsYearForYearEndRun();
  const freeze = await freezePointsYear(admin, pointsYear);

  const existing = await findYearEndGiveawayForYear(admin, pointsYear);
  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      pointsYear,
      freeze,
      giveawayId: existing.id,
    });
  }

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!adminProfile?.id) {
    return NextResponse.json({ error: "no_admin_profile", freeze }, { status: 500 });
  }

  try {
    const result = await createYearEndGiveaway(admin, {
      pointsYear,
      authorId: adminProfile.id,
    });
    return NextResponse.json({ ok: true, pointsYear, freeze, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: message, freeze }, { status: 500 });
  }
}
