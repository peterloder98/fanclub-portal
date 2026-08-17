import type { SupabaseClient } from "@supabase/supabase-js";
import { performGiveawayDraw } from "@/lib/giveaways/perform-draw";
import { notifyAdminsGiveawayEnded } from "@/lib/email/giveaway-notify";
import {
  isExcludedFromYearPointsRanking,
  rankYearEndTopN,
  YEAR_END_TIE_BREAK_SUMMARY,
  type YearEndCandidate,
} from "@/lib/giveaways/year-end-ranking";
import { isHiddenProfileId } from "@/lib/members/hidden";
import {
  defaultPointsYearForYearEndRun,
  yearBoundsBerlin,
} from "@/lib/points/year-bounds";
import {
  freezePointsYear,
  liveYearTotalsPaged,
  loadYearArchiveTotals,
  markArchiveLotteryCompleted,
} from "@/lib/points/year-archive";

export const YEAR_END_LOTTERY_TOP_N = 10;
export { YEAR_END_TIE_BREAK_SUMMARY, defaultPointsYearForYearEndRun };

export function yearBounds(pointsYear: number) {
  return yearBoundsBerlin(pointsYear);
}

export async function sumPointsByUserForYear(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<Array<{ user_id: string; total: number; activityCount: number }>> {
  const archived = await loadYearArchiveTotals(admin, pointsYear);
  if (archived && archived.length > 0) {
    return archived.map((r) => ({
      user_id: r.user_id,
      total: r.points,
      activityCount: r.activity_count,
    }));
  }

  const { data: rpcRows, error: rpcErr } = await admin.rpc("sum_points_by_user_for_year", {
    p_year: pointsYear,
  });
  if (!rpcErr && rpcRows) {
    return (rpcRows as Array<{ user_id: string; points: number; activity_count: number }>).map(
      (r) => ({
        user_id: r.user_id,
        total: Number(r.points),
        activityCount: Number(r.activity_count),
      }),
    );
  }

  const live = await liveYearTotalsPaged(admin, pointsYear);
  return live.map((r) => ({
    user_id: r.user_id,
    total: r.points,
    activityCount: r.activity_count,
  }));
}

async function buildYearEndCandidates(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<YearEndCandidate[]> {
  const sums = await sumPointsByUserForYear(admin, pointsYear);
  if (!sums.length) return [];

  const ids = sums.map((s) => s.user_id);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number,role")
    .in("id", ids);

  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id,start_date,status")
    .in("user_id", ids)
    .eq("status", "active");

  const membershipStart = new Map<string, string>();
  for (const m of memberships ?? []) {
    const prev = membershipStart.get(m.user_id);
    if (!prev || m.start_date < prev) membershipStart.set(m.user_id, m.start_date);
  }

  const profileMap = new Map(
    (profiles ?? [])
      .filter((p) => !isHiddenProfileId(p.id) && !isExcludedFromYearPointsRanking(p.role))
      .map((p) => [p.id, p]),
  );

  return sums
    .filter((s) => profileMap.has(s.user_id))
    .map((s) => {
      const p = profileMap.get(s.user_id)!;
      return {
        user_id: s.user_id,
        total: s.total,
        activityCount: s.activityCount,
        membership_number: p?.membership_number ?? null,
        membership_start: membershipStart.get(s.user_id) ?? null,
        last_name: p?.last_name ?? "",
        first_name: p?.first_name ?? "",
      };
    });
}

export type YearEndTopMember = {
  rank: number;
  userId: string;
  points: number;
  activityCount: number;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    membership_number: string | null;
    avatar_path: string | null;
    updated_at: string | null;
  } | null;
};

export async function getTopMembersForYear(
  admin: SupabaseClient,
  pointsYear: number,
  limit = YEAR_END_LOTTERY_TOP_N,
): Promise<YearEndTopMember[]> {
  const candidates = await buildYearEndCandidates(admin, pointsYear);
  const top = rankYearEndTopN(candidates, limit);
  if (!top.length) return [];

  const ids = top.map((t) => t.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,membership_number,avatar_path,updated_at")
    .in("id", ids);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return top.map((t, index) => ({
    rank: index + 1,
    userId: t.user_id,
    points: t.total,
    activityCount: t.activityCount,
    profile: profileMap.get(t.user_id) ?? null,
  }));
}

export type YearEndGiveawayRow = {
  id: string;
  title: string;
  points_year: number | null;
  year_end_confirmed_at: string | null;
  status: string;
};

export async function findYearEndGiveawayForYear(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<YearEndGiveawayRow | null> {
  const { data } = await admin
    .from("giveaways")
    .select("id,title,points_year,year_end_confirmed_at,status")
    .eq("is_year_end_lottery", true)
    .eq("points_year", pointsYear)
    .maybeSingle();
  return data;
}

export async function createYearEndGiveaway(
  admin: SupabaseClient,
  params: { pointsYear: number; authorId: string },
): Promise<{ giveawayId: string; created: boolean; topCount: number }> {
  const { pointsYear, authorId } = params;

  const { data: existingRun } = await admin
    .from("year_end_lottery_runs")
    .select("giveaway_id")
    .eq("points_year", pointsYear)
    .maybeSingle();
  if (existingRun?.giveaway_id) {
    return { giveawayId: existingRun.giveaway_id, created: false, topCount: 0 };
  }

  const freeze = await freezePointsYear(admin, pointsYear);
  if (!freeze.ok && freeze.error && freeze.error !== "year_not_ended") {
    console.warn("[year-end] Archiv:", freeze.error);
  }

  const top = await getTopMembersForYear(admin, pointsYear);
  if (top.length < 1) {
    throw new Error(
      `Keine Statuspunkte für ${pointsYear} — Sonderverlosung kann nicht angelegt werden.`,
    );
  }

  const endsAt = new Date(pointsYear + 1, 11, 31, 23, 59, 59);

  const title = `Sonderverlosung Top-${YEAR_END_LOTTERY_TOP_N} Statuspunkte ${pointsYear}`;
  const description =
    `Genau ${YEAR_END_LOTTERY_TOP_N} Mitglieder mit den meisten Statuspunkten in ${pointsYear} nehmen automatisch teil. ` +
    `Vorstände sind von Rangliste und Sonderverlosung ausgenommen. ` +
    `Bei Punktgleichstand gilt: ${YEAR_END_TIE_BREAK_SUMMARY} ` +
    `Weitere Teilnahme ist nicht möglich. Nach Eintrag der Preise durch den Vorstand wird ausgelost und die Gewinner per E-Mail benachrichtigt. ` +
    `Ab dem 1. Januar 0:00 (Berlin) zählen die Anni-Stars des neuen Jahres wieder bei null. ` +
    `Die Auswertung ${pointsYear} bleibt bis zur Auslosung archiviert.`;

  const { data: row, error: gErr } = await admin
    .from("giveaways")
    .insert({
      author_id: authorId,
      title,
      description,
      entry_mode: "simple",
      ends_at: endsAt.toISOString(),
      status: "active",
      is_active: true,
      is_paused: false,
      is_year_end_lottery: true,
      points_year: pointsYear,
    })
    .select("id")
    .single();
  if (gErr) throw new Error(gErr.message);

  const entries = top.map((t) => ({
    giveaway_id: row.id,
    user_id: t.userId,
    is_eligible: true,
  }));
  const { error: entErr } = await admin.from("giveaway_entries").insert(entries);
  if (entErr) throw new Error(entErr.message);

  const { error: runErr } = await admin.from("year_end_lottery_runs").insert({
    points_year: pointsYear,
    giveaway_id: row.id,
    top_user_ids: top.map((t) => t.userId),
  });
  if (runErr) {
    // Race: paralleler Create hat den Run gewonnen — Orphan-Gewinnspiel entfernen
    await admin.from("giveaways").delete().eq("id", row.id);
    const { data: winnerRun } = await admin
      .from("year_end_lottery_runs")
      .select("giveaway_id")
      .eq("points_year", pointsYear)
      .maybeSingle();
    if (winnerRun?.giveaway_id) {
      return { giveawayId: winnerRun.giveaway_id, created: false, topCount: 0 };
    }
    throw new Error(runErr.message);
  }

  try {
    await notifyAdminsGiveawayEnded({
      giveawayId: row.id,
      title: `${title} — bitte Preise eintragen und bestätigen`,
    });
  } catch (e) {
    console.error("[year-end] Admin-Hinweis fehlgeschlagen:", e);
  }

  return { giveawayId: row.id, created: true, topCount: top.length };
}

export async function confirmYearEndGiveaway(
  admin: SupabaseClient,
  giveawayId: string,
  signatureId?: string,
  actorId?: string,
) {
  const { data: g } = await admin
    .from("giveaways")
    .select("id,is_year_end_lottery,year_end_confirmed_at,points_year,status")
    .eq("id", giveawayId)
    .maybeSingle();

  if (!g?.is_year_end_lottery) throw new Error("Kein Jahresend-Gewinnspiel.");
  if (g.year_end_confirmed_at) throw new Error("Bereits bestätigt und ausgelost.");
  if (g.status === "drawn") throw new Error("Bereits ausgelost.");

  const result = await performGiveawayDraw(admin, giveawayId, {
    skipEndCheck: true,
    notifyAllWinners: true,
    signatureId,
    actorId,
  });

  const now = new Date().toISOString();
  await admin
    .from("giveaways")
    .update({ year_end_confirmed_at: now })
    .eq("id", giveawayId);

  if (g.points_year) {
    await admin
      .from("year_end_lottery_runs")
      .update({ points_reset_notified_at: now })
      .eq("points_year", g.points_year);
    await markArchiveLotteryCompleted(admin, g.points_year);
  }

  return result;
}
