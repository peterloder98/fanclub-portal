import { Suspense } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { ReferralsAdminPanel } from "@/components/admin/referrals-admin-panel.client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminReferralsPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const [{ data: sendsRaw }, { data: conversionsRaw }, { data: reviewsRaw }] = await Promise.all([
    admin
      .from("membership_referral_sends")
      .select(
        "id,recipient_email,recipient_first_name,recipient_last_name,created_at,link_opened_at,approved_at,converted_application_id,sender_id",
      )
      .order("created_at", { ascending: false })
      .limit(300),
    admin
      .from("referral_conversions")
      .select("id,approved_at,stars_awarded,referrer_user_id,referred_user_id")
      .order("approved_at", { ascending: false })
      .limit(100),
    admin
      .from("membership_referral_reviews")
      .select(
        "id,status,reasons,referral_send_ids,points_transaction_ids,triggered_at,admin_note,referrer_user_id",
      )
      .order("triggered_at", { ascending: false })
      .limit(80)
      .then((r) => {
        if (r.error && /does not exist|membership_referral_reviews/i.test(r.error.message)) {
          return { data: [] as never[] };
        }
        return r;
      }),
  ]);

  const reviews = reviewsRaw ?? [];
  const senderIds = [...new Set((sendsRaw ?? []).map((s) => s.sender_id).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set([
      ...senderIds,
      ...(conversionsRaw ?? []).flatMap((c) => [c.referrer_user_id, c.referred_user_id]),
      ...reviews.map((r) => r.referrer_user_id),
    ]),
  ] as string[];

  const txIds = [
    ...new Set(reviews.flatMap((r) => (r.points_transaction_ids as string[] | null) ?? [])),
  ];

  const [{ data: profiles }, { data: heldTx }] = await Promise.all([
    profileIds.length
      ? admin.from("profiles").select("id,first_name,last_name,email").in("id", profileIds)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> }),
    txIds.length
      ? admin.from("points_transactions").select("id,points").in("id", txIds)
      : Promise.resolve({ data: [] as Array<{ id: string; points: number }> }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const pointsByTx = new Map((heldTx ?? []).map((t) => [t.id, t.points ?? 0]));

  const sends = (sendsRaw ?? []).map((s) => ({
    id: s.id,
    recipient_email: s.recipient_email,
    recipient_first_name: s.recipient_first_name ?? null,
    recipient_last_name: s.recipient_last_name ?? null,
    created_at: s.created_at,
    link_opened_at: s.link_opened_at,
    approved_at: s.approved_at,
    converted_application_id: s.converted_application_id ?? null,
    sender: profileById.get(s.sender_id) ?? null,
  }));

  const conversions = (conversionsRaw ?? []).map((c) => ({
    id: c.id,
    approved_at: c.approved_at,
    stars_awarded: c.stars_awarded,
    referrer: profileById.get(c.referrer_user_id) ?? null,
    referred: profileById.get(c.referred_user_id) ?? null,
  }));

  const reviewRows = reviews.map((r) => {
    const ids = (r.points_transaction_ids as string[] | null) ?? [];
    const held_points = ids.reduce((sum, id) => sum + (pointsByTx.get(id) ?? 0), 0);
    const reasons = Array.isArray(r.reasons)
      ? (r.reasons as string[])
      : typeof r.reasons === "string"
        ? [r.reasons]
        : [];
    return {
      id: r.id,
      status: r.status,
      reasons,
      referral_send_ids: (r.referral_send_ids as string[] | null) ?? [],
      points_transaction_ids: ids,
      triggered_at: r.triggered_at,
      admin_note: r.admin_note,
      referrer: profileById.get(r.referrer_user_id) ?? null,
      held_points,
    };
  });

  return (
    <div className="min-h-screen">
      <Topbar title="Empfehlungen" subtitle="Versendete Einladungen, Werbungen und Prüfungen." />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin" />
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-fc-ice" />}>
          <ReferralsAdminPanel
            sends={sends}
            conversions={conversions}
            reviews={reviewRows}
          />
        </Suspense>
      </main>
    </div>
  );
}
