import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { POINT_VALUES } from "@/lib/points/values";

export const MEMBERSHIP_REFERRAL_POINTS = POINT_VALUES.membershipReferral;

export async function awardMembershipReferralPoints(
  senderId: string,
  recipientEmail: string,
  recipient?: {
    firstName?: string;
    lastName?: string;
    gender?: string | null;
  },
): Promise<{ awarded: boolean; points: number; referralToken: string | null }> {
  const admin = createSupabaseAdminClient();
  const email = recipientEmail.trim().toLowerCase();
  if (!email) return { awarded: false, points: 0, referralToken: null };

  const gender =
    recipient?.gender === "m" || recipient?.gender === "w" ? recipient.gender : null;

  const { data: sendRow, error: sendErr } = await admin
    .from("membership_referral_sends")
    .insert({
      sender_id: senderId,
      recipient_email: email,
      recipient_first_name: recipient?.firstName?.trim() || null,
      recipient_last_name: recipient?.lastName?.trim() || null,
      recipient_gender: gender,
    })
    .select("id,referral_token")
    .maybeSingle();

  if (sendErr) {
    if (sendErr.code === "23505") {
      const { data: existing } = await admin
        .from("membership_referral_sends")
        .select("referral_token")
        .eq("sender_id", senderId)
        .ilike("recipient_email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { awarded: false, points: 0, referralToken: existing?.referral_token ?? null };
    }
    throw new Error(sendErr.message);
  }

  if (!sendRow?.id) return { awarded: false, points: 0, referralToken: null };

  const { error: ptsErr } = await admin.from("points_transactions").insert({
    user_id: senderId,
    points: MEMBERSHIP_REFERRAL_POINTS,
    reason: "membership_referral",
    entity_type: "membership_referral",
    entity_id: sendRow.id,
  });

  if (ptsErr) {
    if (ptsErr.code === "23505") {
      return {
        awarded: false,
        points: 0,
        referralToken: sendRow.referral_token ?? null,
      };
    }
    throw new Error(ptsErr.message);
  }

  return {
    awarded: true,
    points: MEMBERSHIP_REFERRAL_POINTS,
    referralToken: sendRow.referral_token ?? null,
  };
}
