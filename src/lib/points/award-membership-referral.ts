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
): Promise<{ awarded: boolean; points: number; referralToken: string | null; sendId: string | null }> {
  const admin = createSupabaseAdminClient();
  const email = recipientEmail.trim().toLowerCase();
  if (!email) return { awarded: false, points: 0, referralToken: null, sendId: null };

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
    throw new Error(sendErr.message);
  }

  if (!sendRow?.id) return { awarded: false, points: 0, referralToken: null, sendId: null };

  // Sterne nur einmal pro Absender+Empfänger-Adresse (Reminder nach 14 Tagen ohne neue Sterne)
  const { data: priorSends } = await admin
    .from("membership_referral_sends")
    .select("id")
    .eq("sender_id", senderId)
    .ilike("recipient_email", email)
    .neq("id", sendRow.id);

  const priorSendIds = (priorSends ?? []).map((s) => s.id);
  if (priorSendIds.length) {
    const { data: existingPts } = await admin
      .from("points_transactions")
      .select("id")
      .eq("user_id", senderId)
      .eq("reason", "membership_referral")
      .in("entity_id", priorSendIds)
      .limit(1)
      .maybeSingle();
    if (existingPts?.id) {
      return {
        awarded: false,
        points: 0,
        referralToken: sendRow.referral_token ?? null,
        sendId: sendRow.id,
      };
    }
  }

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
        sendId: sendRow.id,
      };
    }
    throw new Error(ptsErr.message);
  }

  return {
    awarded: true,
    points: MEMBERSHIP_REFERRAL_POINTS,
    referralToken: sendRow.referral_token ?? null,
    sendId: sendRow.id,
  };
}
