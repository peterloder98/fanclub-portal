import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MEMBERSHIP_REFERRAL_COMPLETION_POINTS = 100;

export async function awardMembershipReferralCompletionPoints(
  referrerId: string,
  applicationId: string,
): Promise<{ awarded: boolean; points: number }> {
  const admin = createSupabaseAdminClient();

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

  return { awarded: true, points: MEMBERSHIP_REFERRAL_COMPLETION_POINTS };
}
