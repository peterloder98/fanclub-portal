import Link from "next/link";
import { Topbar } from "@/components/app-shell/topbar";
import { ApplicationDetailPanels } from "@/components/admin/application-detail-panels";
import { ApplicationActionsToolbar } from "@/components/admin/application-actions-toolbar.client";
import { MemberActivityTimeline } from "@/components/admin/member-activity-timeline";
import { membershipStatusLabel } from "@/lib/membership/provision-applicant";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/payments/labels";
import type { PaymentMethod, PaymentStatus } from "@/lib/payments/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/require-admin";
import { redirect } from "next/navigation";

function formatDE(date: string | null) {
  if (!date) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-");
    return `${d}.${m}.${y}`;
  }
  const x = new Date(date);
  return Number.isNaN(x.getTime()) ? date : x.toLocaleDateString("de-DE");
}

export default async function AdminMembershipApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const approved = sp.approved === "1";

  const admin = createSupabaseAdminClient();
  const { data: app, error } = await admin
    .from("membership_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !app) redirect("/admin/members");

  let membershipStatus: string | null = null;
  if (app.user_id) {
    const { data: m } = await admin
      .from("memberships")
      .select("status")
      .eq("user_id", app.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    membershipStatus = m?.status ?? null;
  }

  let paymentStatus: PaymentStatus | null = null;
  let paymentReference: string | null = null;
  let paymentMethodLabel: string | null = null;
  try {
    const { data: payment } = await admin
      .from("payments")
      .select("payment_status,internal_reference,payment_method")
      .eq("application_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (payment) {
      paymentStatus = payment.payment_status as PaymentStatus;
      paymentReference = payment.internal_reference;
      paymentMethodLabel =
        PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? payment.payment_method;
    }
  } catch {
    /* payments table optional until migration */
  }

  const detail = {
    id: app.id,
    status: app.status,
    user_id: app.user_id,
    first_name: app.first_name,
    last_name: app.last_name,
    birthdate: app.birthdate,
    gender: app.gender,
    street: app.street,
    postal_code: app.postal_code,
    city: app.city,
    country: app.country,
    country_code: app.country_code,
    phone: app.phone,
    mobile_dial_code: app.mobile_dial_code,
    mobile_number: app.mobile_number,
    email: app.email,
    membership_start_date: app.membership_start_date,
    account_holder: app.account_holder,
    iban: app.iban,
    bic: app.bic,
    whatsapp_opt_in: app.whatsapp_opt_in,
    whatsapp_dial_code: app.whatsapp_dial_code,
    whatsapp_number: app.whatsapp_number,
    instagram: app.instagram,
    facebook: app.facebook,
    fee_cents: app.fee_cents,
    media_consent: app.media_consent,
    signed_at_place: app.signed_at_place,
    signed_at_date: app.signed_at_date,
    created_at: app.created_at,
    membership_status: membershipStatus,
    membership_status_label: membershipStatusLabel(membershipStatus),
    payment_status: paymentStatus,
    payment_status_label: paymentStatus ? PAYMENT_STATUS_LABELS[paymentStatus] : null,
    payment_reference: paymentReference,
    payment_method_label: paymentMethodLabel,
  };

  return (
    <div className="min-h-screen">
      <Topbar
        title={`Antrag: ${app.first_name} ${app.last_name}`}
        subtitle={`Eingegangen ${formatDE(app.created_at)}`}
      />
      <main className="px-4 py-6 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-3">
          <Link href="/admin/members" className="text-sm font-medium text-fc-blue hover:underline">
            ← Mitglieder
          </Link>
          {app.user_id ? (
            <Link
              href={`/admin/members/${app.user_id}`}
              className="text-sm font-medium text-fc-blue hover:underline"
            >
              Profil bearbeiten
            </Link>
          ) : null}
        </div>

        <div className="mb-6">
          <ApplicationActionsToolbar
            app={{
              id: app.id,
              first_name: app.first_name,
              last_name: app.last_name,
              email: app.email,
              status: app.status,
              user_id: app.user_id,
            }}
          />
        </div>

        <ApplicationDetailPanels app={detail} showApprovedBanner={approved} />

        <div id="application-activity" className="mt-6">
          <MemberActivityTimeline userId={app.user_id} applicationId={app.id} />
        </div>
      </main>
    </div>
  );
}
