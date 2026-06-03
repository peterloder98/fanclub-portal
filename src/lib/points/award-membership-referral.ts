import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MEMBERSHIP_REFERRAL_POINTS = 20;

export async function awardMembershipReferralPoints(
  senderId: string,
  recipientEmail: string,
): Promise<{ awarded: boolean; points: number }> {
  const admin = createSupabaseAdminClient();
  const email = recipientEmail.trim().toLowerCase();
  if (!email) return { awarded: false, points: 0 };

  const { data: sendRow, error: sendErr } = await admin
    .from("membership_referral_sends")
    .insert({ sender_id: senderId, recipient_email: email })
    .select("id")
    .maybeSingle();

  if (sendErr) {
    if (sendErr.code === "23505") {
      return { awarded: false, points: 0 };
    }
    throw new Error(sendErr.message);
  }

  if (!sendRow?.id) return { awarded: false, points: 0 };

  const { error: ptsErr } = await admin.from("points_transactions").insert({
    user_id: senderId,
    points: MEMBERSHIP_REFERRAL_POINTS,
    reason: "membership_referral",
    entity_type: "membership_referral",
    entity_id: sendRow.id,
  });

  if (ptsErr) {
    if (ptsErr.code === "23505") {
      return { awarded: false, points: 0 };
    }
    throw new Error(ptsErr.message);
  }

  return { awarded: true, points: MEMBERSHIP_REFERRAL_POINTS };
}
