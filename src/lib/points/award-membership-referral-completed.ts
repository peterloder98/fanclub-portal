import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { POINT_VALUES } from "@/lib/points/values";
import { notifyRankUpIfChanged, sumUserPointsThisYear } from "@/lib/points/rank-notify";

export const MEMBERSHIP_REFERRAL_COMPLETION_POINTS = POINT_VALUES.membershipReferralCompleted;

export async function awardMembershipReferralCompletionPoints(
  referrerId: string,
  applicationId: string,
): Promise<{ awarded: boolean; points: number }> {
  const admin = createSupabaseAdminClient();
  const pointsBefore = await sumUserPointsThisYear(referrerId);

  const { error: ptsErr } = await admin.from("points_transactions").insert({
    user_id: referrerId,
    points: MEMBERSHIP_REFERRAL_COMPLETION_POINTS,
    reason: "membership_referral_completed",
    entity_type: "membership_application",
    entity_id: applicationId,
  });

  if (ptsErr) {
    if (ptsErr.code === "23505") {
      return { awarded: false, points: 0 };
    }
    throw new Error(ptsErr.message);
  }

  await notifyRankUpIfChanged(
    referrerId,
    pointsBefore,
    pointsBefore + MEMBERSHIP_REFERRAL_COMPLETION_POINTS,
  ).catch(console.error);

  return { awarded: true, points: MEMBERSHIP_REFERRAL_COMPLETION_POINTS };
}
