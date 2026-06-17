import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { evaluateUserBadges } from "@/lib/badges/evaluate-user-badges";
import { notifyRankUpIfChanged, sumUserPointsThisYear } from "@/lib/points/rank-notify";
import { POINT_VALUES } from "@/lib/points/values";

export type RecordRadioParticipationResult = {
  ok: boolean;
  alreadyParticipated: boolean;
  starsAwarded: number;
  error?: string;
};

export async function recordRadioVotingParticipation(
  userId: string,
  campaignId: string,
): Promise<RecordRadioParticipationResult> {
  const admin = createSupabaseAdminClient();

  const { data: campaign, error: cErr } = await admin
    .from("radio_voting_campaigns")
    .select("id,cycle_key,is_active,ends_at")
    .eq("id", campaignId)
    .maybeSingle();

  if (cErr) return { ok: false, alreadyParticipated: false, starsAwarded: 0, error: cErr.message };
  if (!campaign?.is_active) {
    return { ok: false, alreadyParticipated: false, starsAwarded: 0, error: "Voting nicht aktiv." };
  }
  if (new Date(campaign.ends_at).getTime() <= Date.now()) {
    return { ok: false, alreadyParticipated: false, starsAwarded: 0, error: "Voting beendet." };
  }

  const cycleKey = campaign.cycle_key as string;

  const { data: existing } = await admin
    .from("radio_voting_participations")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .eq("cycle_key", cycleKey)
    .maybeSingle();

  if (existing) {
    return { ok: true, alreadyParticipated: true, starsAwarded: 0 };
  }

  const { error: insErr } = await admin.from("radio_voting_participations").insert({
    campaign_id: campaignId,
    user_id: userId,
    cycle_key: cycleKey,
  });

  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) {
      return { ok: true, alreadyParticipated: true, starsAwarded: 0 };
    }
    return { ok: false, alreadyParticipated: false, starsAwarded: 0, error: insErr.message };
  }

  const entityId = `${campaignId}:${cycleKey}`;
  const pointsBefore = await sumUserPointsThisYear(userId);

  const { error: ptErr } = await admin.from("points_transactions").insert({
    user_id: userId,
    points: POINT_VALUES.radioVoting,
    reason: "radio_voting",
    entity_type: "radio_voting_campaign",
    entity_id: entityId,
  });

  let starsAwarded = 0;
  if (!ptErr) {
    starsAwarded = POINT_VALUES.radioVoting;
    const pointsAfter = await sumUserPointsThisYear(userId);
    await notifyRankUpIfChanged(userId, pointsBefore, pointsAfter);
    try {
      await evaluateUserBadges(userId);
    } catch {
      /* Badge-Fehler nicht blockieren */
    }
  } else if (!/duplicate|unique/i.test(ptErr.message)) {
    console.error("[radio-voting] points:", ptErr.message);
  }

  return { ok: true, alreadyParticipated: false, starsAwarded };
}
