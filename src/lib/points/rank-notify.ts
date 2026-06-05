import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { rankFromPoints } from "@/lib/points/rank";

function yearStartIso() {
  return new Date(new Date().getFullYear(), 0, 1).toISOString();
}

export async function sumUserPointsThisYear(userId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("points_transactions")
    .select("points")
    .eq("user_id", userId)
    .gte("created_at", yearStartIso());
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
}

/** Nach Punktevergabe prüfen, ob sich der Jahresrang geändert hat. */
export async function notifyRankUpIfChanged(
  userId: string,
  pointsBefore: number,
  pointsAfter: number,
) {
  const oldRank = rankFromPoints(pointsBefore);
  const newRank = rankFromPoints(pointsAfter);
  if (oldRank === newRank) return;

  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  await createUserNotification({
    userId,
    kind: NOTIFICATION_KINDS.rankUp,
    title: `Neuer Rang: ${newRank}`,
    body: `Glückwunsch! Du hast den Status „${newRank}" erreicht.`,
    linkUrl: base ? `${base}/punkte` : "/punkte",
    linkLabel: "Statuspunkte",
    metadata: { old_rank: oldRank, new_rank: newRank, dedupe_key: `rank:${newRank}:${new Date().getFullYear()}` },
  }).catch(console.error);
}

export async function awardPointsWithRankCheck(
  userId: string,
  insertFn: (pointsBefore: number) => Promise<void>,
) {
  const pointsBefore = await sumUserPointsThisYear(userId);
  await insertFn(pointsBefore);
  const pointsAfter = await sumUserPointsThisYear(userId);
  await notifyRankUpIfChanged(userId, pointsBefore, pointsAfter);
}
