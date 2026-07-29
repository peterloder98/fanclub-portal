"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function releaseReferralReviewPointsAction(reviewId: string, adminNote?: string) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: review, error } = await admin
    .from("membership_referral_reviews")
    .select("id,status,points_transaction_ids")
    .eq("id", reviewId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!review || review.status !== "open") throw new Error("Fall nicht gefunden oder bereits erledigt.");

  const txIds = (review.points_transaction_ids ?? []) as string[];
  if (txIds.length) {
    const { error: updErr } = await admin
      .from("points_transactions")
      .update({ held_at: null })
      .in("id", txIds);
    if (updErr) throw new Error(updErr.message);
  }

  const { error: revErr } = await admin
    .from("membership_referral_reviews")
    .update({
      status: "released",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote?.trim() || null,
    })
    .eq("id", reviewId);
  if (revErr) throw new Error(revErr.message);

  revalidatePath("/admin/referrals");
  return { ok: true as const };
}

export async function clawbackReferralReviewPointsAction(reviewId: string, adminNote?: string) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: review, error } = await admin
    .from("membership_referral_reviews")
    .select("id,status,points_transaction_ids")
    .eq("id", reviewId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!review || review.status !== "open") throw new Error("Fall nicht gefunden oder bereits erledigt.");

  const txIds = (review.points_transaction_ids ?? []) as string[];
  if (txIds.length) {
    const { error: delErr } = await admin.from("points_transactions").delete().in("id", txIds);
    if (delErr) throw new Error(delErr.message);
  }

  const { error: revErr } = await admin
    .from("membership_referral_reviews")
    .update({
      status: "clawed_back",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote?.trim() || null,
    })
    .eq("id", reviewId);
  if (revErr) throw new Error(revErr.message);

  revalidatePath("/admin/referrals");
  return { ok: true as const };
}
