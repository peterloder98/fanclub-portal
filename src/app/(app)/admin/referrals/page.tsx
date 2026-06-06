import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { ReferralsAdminPanel } from "@/components/admin/referrals-admin-panel.client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function AdminReferralsPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const [{ data: sendsRaw }, { data: conversionsRaw }] = await Promise.all([
    admin
      .from("membership_referral_sends")
      .select("id,recipient_email,created_at,link_opened_at,approved_at,sender_id")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("referral_conversions")
      .select("id,approved_at,stars_awarded,referrer_user_id,referred_user_id")
      .order("approved_at", { ascending: false })
      .limit(100),
  ]);

  const senderIds = [...new Set((sendsRaw ?? []).map((s) => s.sender_id).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set([
      ...senderIds,
      ...(conversionsRaw ?? []).flatMap((c) => [c.referrer_user_id, c.referred_user_id]),
    ]),
  ] as string[];

  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("id,first_name,last_name,email").in("id", profileIds)
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const sends = (sendsRaw ?? []).map((s) => ({
    id: s.id,
    recipient_email: s.recipient_email,
    created_at: s.created_at,
    link_opened_at: s.link_opened_at,
    approved_at: s.approved_at,
    sender: profileById.get(s.sender_id) ?? null,
  }));

  const conversions = (conversionsRaw ?? []).map((c) => ({
    id: c.id,
    approved_at: c.approved_at,
    stars_awarded: c.stars_awarded,
    referrer: profileById.get(c.referrer_user_id) ?? null,
    referred: profileById.get(c.referred_user_id) ?? null,
  }));

  return (
    <div className="min-h-screen">
      <Topbar title="Empfehlungen" subtitle="Versendete Einladungen und erfolgreiche Werbungen." />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin" />
        <ReferralsAdminPanel sends={sends ?? []} conversions={conversions ?? []} />
      </main>
    </div>
  );
}
