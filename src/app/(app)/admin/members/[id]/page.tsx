import { Topbar } from "@/components/app-shell/topbar";
import {
  MemberDetailPanel,
  type MemberDetailData,
  type MemberWarningRow,
} from "@/components/admin/member-detail-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listClubLedger } from "@/lib/club/ledger";
import { getMemberContributionYears } from "@/lib/club/membership-contribution";
import { redirect } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import {
  resolveAppRegistrationStatus,
  type AppRegistrationStatus,
} from "@/lib/membership/app-registration";
import { buildMemberApplicationPaymentDraft } from "@/lib/email/application-payment-draft";
import type { ApplicationPaymentMailDraft } from "@/lib/email/application-payment-draft";
import { userFacingActionError } from "@/lib/admin/user-facing-action-error";

export const dynamic = "force-dynamic";

async function loadAppRegistration(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from("profiles")
    .select("app_registration_status,app_registered_at,last_app_active_at")
    .eq("id", userId)
    .maybeSingle();

  let lastSignInAt: string | null = null;
  try {
    const { data: authData } = await admin.auth.admin.getUserById(userId);
    lastSignInAt = authData.user?.last_sign_in_at ?? null;
  } catch {
    /* ignore */
  }

  const lastAppActiveAt =
    (profile as { last_app_active_at?: string | null } | null)?.last_app_active_at ?? null;

  const status = resolveAppRegistrationStatus({
    status: (profile as { app_registration_status?: string | null } | null)?.app_registration_status,
    registeredAt: (profile as { app_registered_at?: string | null } | null)?.app_registered_at,
    lastSignInAt,
    lastAppActiveAt,
  });

  // Lazy-Backfill: schon eingeloggt / App-aktiv → als registriert speichern
  if (
    status === "registered" &&
    (profile as { app_registration_status?: string | null } | null)?.app_registration_status !==
      "registered" &&
    (profile as { app_registration_status?: string | null } | null)?.app_registration_status !==
      "deleted"
  ) {
    const { error: bfErr } = await admin
      .from("profiles")
      .update({
        app_registration_status: "registered",
        app_registered_at:
          (profile as { app_registered_at?: string | null } | null)?.app_registered_at ??
          lastAppActiveAt ??
          lastSignInAt ??
          new Date().toISOString(),
      })
      .eq("id", userId);
    if (bfErr && !/app_registration_status|does not exist/i.test(bfErr.message)) {
      console.error("[admin/members] app_registration backfill:", bfErr.message);
    }
  }

  return {
    status,
    registeredAt:
      status === "registered"
        ? ((profile as { app_registered_at?: string | null } | null)?.app_registered_at ??
          lastAppActiveAt ??
          lastSignInAt)
        : null,
  } satisfies { status: AppRegistrationStatus; registeredAt: string | null };
}

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ remind?: string; paperMail?: string }>;
}) {
  const { id } = await params;
  const { remind, paperMail } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  let profile: Record<string, unknown> | null = null;
  {
    const full = await admin
      .from("profiles")
      .select(
        "id,membership_number,first_name,last_name,email,username,role,phone,birthdate,gender,street,postal_code,city,country,warning_count,contribution_date,greeting_post_sent_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (full.error && /greeting_post_sent_at|does not exist/i.test(full.error.message)) {
      const fallback = await admin
        .from("profiles")
        .select(
          "id,membership_number,first_name,last_name,email,username,role,phone,birthdate,gender,street,postal_code,city,country,warning_count,contribution_date",
        )
        .eq("id", id)
        .maybeSingle();
      if (fallback.error) throw new Error(fallback.error.message);
      profile = fallback.data;
    } else if (full.error) {
      throw new Error(full.error.message);
    } else {
      profile = full.data;
    }
  }
  if (!profile) redirect("/admin/members");

  const { data: membership } = await admin
    .from("memberships")
    .select("start_date,end_date,status,fee_cents,suspension_reason")
    .eq("user_id", id)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: application } = await admin
    .from("membership_applications")
    .select("id")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: warningRows, error: wErr } = await admin
    .from("member_warnings")
    .select(
      "id,comment_text,comment_created_at,context_title,context_author_name,context_kind,created_at,issued_by",
    )
    .eq("member_id", id)
    .order("created_at", { ascending: false });

  const issuerIds = Array.from(
    new Set((warningRows ?? []).map((w) => w.issued_by).filter(Boolean)),
  ) as string[];
  const { data: issuers } = issuerIds.length
    ? await admin.from("profiles").select("id,first_name,last_name").in("id", issuerIds)
    : { data: [] };
  const issuerNameById = new Map(
    (issuers ?? []).map((p) => [
      p.id,
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Admin",
    ]),
  );

  const warnings: MemberWarningRow[] = (warningRows ?? []).map((w) => ({
    id: w.id,
    comment_text: w.comment_text,
    comment_created_at: w.comment_created_at,
    context_title: w.context_title,
    context_author_name: w.context_author_name,
    context_kind: w.context_kind,
    created_at: w.created_at,
    issued_by_name: w.issued_by ? (issuerNameById.get(w.issued_by) ?? null) : null,
  }));

  const warningCountFromRows = warnings.length;
  const warningCount = Math.max(
    typeof profile.warning_count === "number" ? profile.warning_count : 0,
    warningCountFromRows,
  );

  let ledgerEntries: Awaited<ReturnType<typeof listClubLedger>> = [];
  let ledgerAvailable = true;
  try {
    ledgerEntries = await listClubLedger({ memberId: id, limit: 50 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/club_ledger_entries|does not exist/i.test(msg)) {
      ledgerAvailable = false;
    } else {
      throw e;
    }
  }

  const contributions = await getMemberContributionYears(id).catch(() => []);
  const appReg = await loadAppRegistration(admin, id);

  let initialPaperMailDraft: ApplicationPaymentMailDraft | null = null;
  let initialPaperMailError: string | null = null;
  if (paperMail === "1" && profile.email) {
    try {
      initialPaperMailDraft = await buildMemberApplicationPaymentDraft(id);
    } catch (e) {
      console.error("[admin/members] paperMail draft:", e);
      initialPaperMailError = userFacingActionError(
        e,
        "Vorlage „Antrag / Zahlungsinfo“ konnte nicht geladen werden. Bitte „Zahlungsinfo senden“ erneut tippen.",
      );
    }
  }

  const member: MemberDetailData = {
    id: String(profile.id),
    membership_number: (profile.membership_number as string | null) ?? null,
    first_name: String(profile.first_name ?? ""),
    last_name: String(profile.last_name ?? ""),
    email: (profile.email as string | null) ?? null,
    username: (profile.username as string | null) ?? null,
    role: String(profile.role ?? "member"),
    phone: (profile.phone as string | null) ?? null,
    birthdate: (profile.birthdate as string | null) ?? null,
    gender: (profile.gender as string | null) ?? null,
    street: (profile.street as string | null) ?? null,
    postal_code: (profile.postal_code as string | null) ?? null,
    city: (profile.city as string | null) ?? null,
    country: (profile.country as string | null) ?? null,
    warning_count: warningCount,
    contribution_date: (profile.contribution_date as string | null) ?? null,
    membership: membership
      ? {
          start_date: membership.start_date,
          end_date: membership.end_date,
          status: membership.status,
          fee_cents: membership.fee_cents,
          suspension_reason: membership.suspension_reason ?? null,
        }
      : null,
    application_id: application?.id ?? null,
    app_registration_status: appReg.status,
    app_registered_at: appReg.registeredAt,
    greeting_post_sent_at: (profile.greeting_post_sent_at as string | null | undefined) ?? null,
  };

  return (
    <div className="min-h-screen">
      <Topbar
        title="Mitgliedsdatensatz"
        subtitle={`${String(profile.first_name ?? "")} ${String(profile.last_name ?? "")}${
          profile.membership_number ? ` · Nr. ${profile.membership_number}` : ""
        }`}
      />
      <main className="px-4 py-6 lg:px-8">
        <AdminBackLink href="/admin/members" label="← Mitgliederliste" />
        <div className="mt-4">
        {wErr && /member_warnings|does not exist/i.test(wErr.message) ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Verwarnungs-Tabelle fehlt. Bitte{" "}
            <code className="rounded bg-amber-100 px-1">supabase/048_profiles_contributions_warnings.sql</code>{" "}
            ausführen.
          </div>
        ) : null}

        <MemberDetailPanel
          member={member}
          warnings={warnings}
          ledgerEntries={ledgerEntries}
          ledgerAvailable={ledgerAvailable}
          contributions={contributions}
          autoOpenReminder={remind === "1"}
          autoOpenPaperMail={paperMail === "1"}
          initialPaperMailDraft={
            initialPaperMailDraft
              ? {
                  subject: initialPaperMailDraft.subject,
                  body: initialPaperMailDraft.body,
                  signatures: initialPaperMailDraft.signatures,
                  defaultSignatureId: initialPaperMailDraft.defaultSignatureId,
                  signatureTexts: initialPaperMailDraft.signatureTexts,
                }
              : null
          }
          initialPaperMailError={initialPaperMailError}
        />
        </div>
      </main>
    </div>
  );
}
