"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { auditLog } from "@/lib/admin/audit-log";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { loadSignaturePickerData } from "@/lib/email/draft-with-signatures";
import { CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import {
  logMemberActivity,
  listMemberActivity,
  MEMBER_ACTIVITY_TYPES,
} from "@/lib/membership/activity-log";
import { deleteMembershipApplicationCompletely } from "@/lib/membership/delete-application";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { activateApplication } from "@/lib/membership/activate-application";
import {
  formatContributionEmailVars,
  getMemberContributionInfo,
  resolveMemberPaymentReference,
} from "@/lib/club/membership-contribution";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";

export async function approveMembershipApplication(applicationId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { inviteEmailOk } = await activateApplication(admin, applicationId);
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/applications/${applicationId}`);
  const q =
    inviteEmailOk === false ? "approved=1&invite_email=failed" : "approved=1";
  redirect(`/admin/members/applications/${applicationId}?${q}`);
}

export async function approveMembershipApplicationWithNumber(
  applicationId: string,
  _membershipNumber?: string,
) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { inviteEmailOk } = await activateApplication(admin, applicationId, undefined, user.id);
  await auditLog({
    actorId: user.id,
    action: "application.approve",
    entityType: "membership_application",
    entityId: applicationId,
    summary:
      inviteEmailOk === false
        ? "Mitgliedsantrag freigegeben (Einladungs-E-Mail fehlgeschlagen)"
        : "Mitgliedsantrag freigegeben",
    metadata: { invite_email_ok: inviteEmailOk },
  });
  revalidatePath("/admin/members");
  redirect(
    inviteEmailOk === false
      ? "/admin/members?invite_email=failed"
      : "/admin/members",
  );
}

export async function getPaymentReminderDraft(
  applicationId: string,
  signatureId?: string,
) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,first_name,last_name,email,gender,fee_cents")
    .eq("id", applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app?.email) throw new Error("Antrag oder E-Mail nicht gefunden.");

  const { signatures, defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const useSignatureId = signatureId ?? defaultSignatureId;

  const feeEur = `${((app.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const contrib = app.user_id ? await getMemberContributionInfo(app.user_id) : null;
  let membershipNumber: string | null = null;
  if (app.user_id) {
    const { data: memberProfile } = await admin
      .from("profiles")
      .select("membership_number")
      .eq("id", app.user_id)
      .maybeSingle();
    membershipNumber = memberProfile?.membership_number ?? null;
  }
  const reminderYear = contrib?.calendarYear ?? new Date().getFullYear();
  const contribVars = contrib
    ? formatContributionEmailVars(contrib)
    : {
        fee_eur: feeEur.replace(" EUR", " €"),
        fee_paid_eur: "0,00 €",
        fee_open_eur: feeEur.replace(" EUR", " €"),
        membership_period: String(new Date().getFullYear()),
      };
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: app.first_name?.trim() || "Fan",
      gender: app.gender ?? "",
      last_name: app.last_name?.trim() || "",
      applicant_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
      email: app.email,
      fee_eur: contribVars.fee_eur,
      fee_paid_eur: contribVars.fee_paid_eur,
      fee_open_eur: contribVars.fee_open_eur,
      membership_period: contribVars.membership_period,
      ...clubBankEmailVars(),
      bank_reference: resolveMemberPaymentReference({
        calendarYear: reminderYear,
        membershipNumber,
        firstName: app.first_name,
        lastName: app.last_name,
        fromContribution: contrib?.paymentReference,
      }),
    },
    { signatureId: useSignatureId },
  );

  return {
    subject: rendered.subject,
    body: rendered.text,
    to: app.email,
    signatures,
    defaultSignatureId: useSignatureId,
    signatureTexts,
  };
}

export async function sendPaymentReminderEmail(input: {
  applicationId: string;
  subject: string;
  body: string;
  signatureId: string;
}) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,email,first_name,last_name,gender,fee_cents")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app?.email) throw new Error("E-Mail des Antragstellers fehlt.");

  const feeEur = `${((app.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const contrib = app.user_id ? await getMemberContributionInfo(app.user_id) : null;
  let membershipNumber: string | null = null;
  if (app.user_id) {
    const { data: memberProfile } = await admin
      .from("profiles")
      .select("membership_number")
      .eq("id", app.user_id)
      .maybeSingle();
    membershipNumber = memberProfile?.membership_number ?? null;
  }
  const reminderYear = contrib?.calendarYear ?? new Date().getFullYear();
  const contribVars = contrib
    ? formatContributionEmailVars(contrib)
    : {
        fee_eur: feeEur.replace(" EUR", " €"),
        fee_paid_eur: "0,00 €",
        fee_open_eur: feeEur.replace(" EUR", " €"),
        membership_period: String(new Date().getFullYear()),
      };
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: app.first_name?.trim() || "Fan",
      gender: app.gender ?? "",
      last_name: app.last_name?.trim() || "",
      applicant_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
      email: app.email,
      fee_eur: contribVars.fee_eur,
      fee_paid_eur: contribVars.fee_paid_eur,
      fee_open_eur: contribVars.fee_open_eur,
      membership_period: contribVars.membership_period,
      ...clubBankEmailVars(),
      bank_reference: resolveMemberPaymentReference({
        calendarYear: reminderYear,
        membershipNumber,
        firstName: app.first_name,
        lastName: app.last_name,
        fromContribution: contrib?.paymentReference,
      }),
    },
    { signatureId: input.signatureId || CLUB_SIGNATURE_ID },
  );

  const attachments = rendered.signatureAttachment
    ? [
        {
          filename: rendered.signatureAttachment.filename,
          content: Buffer.from(rendered.signatureAttachment.content),
          contentType: rendered.signatureAttachment.contentType,
          cid: rendered.signatureAttachment.cid,
        },
      ]
    : undefined;

  const subject = input.subject.trim() || rendered.subject;
  const text = input.body.trim() || rendered.text;
  const html = input.body.trim()
    ? buildHtmlFromPlain(text, rendered.signatureHtml, rendered.signatureText)
    : rendered.html;

  const result = await sendEmailViaAccount({
    to: app.email,
    subject,
    text,
    html,
    attachments,
  });

  if (!result.ok) {
    if (result.skipped) {
      throw new Error(
        "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).",
      );
    }
    throw new Error("E-Mail konnte nicht gesendet werden (SMTP prüfen).");
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  await logMemberActivity({
    userId: app.user_id,
    applicationId: app.id,
    eventType: MEMBER_ACTIVITY_TYPES.paymentReminderSent,
    title: "Zahlungserinnerung per E-Mail gesendet",
    details: `Betreff: ${subject}`,
    linkUrl: base ? `${base}/admin/members/applications/${app.id}` : null,
    linkLabel: "Antrag & PDF",
    createdBy: user.id,
    metadata: { signature_id: input.signatureId },
  }).catch((e) => {
    console.error("[activity] Zahlungserinnerung nicht protokolliert:", e);
  });

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function fetchMemberActivity(input: {
  userId?: string | null;
  applicationId?: string | null;
}) {
  await requireAdminAction();
  try {
    return await listMemberActivity({
      userId: input.userId,
      applicationId: input.applicationId,
      limit: 80,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/member_activity_log|does not exist/i.test(msg)) {
      throw new Error(
        "Historie-Tabelle fehlt. Bitte supabase/027_member_activity_log.sql im SQL Editor ausführen.",
      );
    }
    throw e;
  }
}

export async function addMemberActivityNote(input: {
  userId?: string | null;
  applicationId?: string | null;
  eventType: "payment_received" | "warning_issued" | "note";
  title: string;
  details?: string;
  linkUrl?: string;
  linkLabel?: string;
  paymentAmountEur?: number;
  paymentDate?: string;
}) {
  const { user } = await requireAdminAction();
  if (!input.userId && !input.applicationId) {
    throw new Error("userId oder applicationId erforderlich.");
  }

  if (input.eventType === "payment_received" && input.userId) {
    const { addClubLedgerEntry } = await import("@/app/(app)/admin/members/detail-actions");
    const amount = input.paymentAmountEur ?? 15;
    const entryDate = input.paymentDate ?? new Date().toISOString().slice(0, 10);
    await addClubLedgerEntry({
      entryType: "income",
      amountEur: amount,
      description: input.title.trim() || "Mitgliedsbeitrag",
      category: "membership",
      memberId: input.userId,
      entryDate,
    });
    return;
  }

  await logMemberActivity({
    userId: input.userId,
    applicationId: input.applicationId,
    eventType: input.eventType,
    title: input.title.trim(),
    details: input.details?.trim() || null,
    linkUrl: input.linkUrl?.trim() || null,
    linkLabel: input.linkLabel?.trim() || null,
    createdBy: user.id,
  });
  revalidatePath("/admin/members");
}

export async function rejectMembershipApplication(input: {
  applicationId: string;
  reason?: string;
}) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,first_name,last_name,email,status")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Antrag nicht gefunden.");
  if (app.status === "approved") {
    throw new Error("Freigegebene Anträge können nicht abgelehnt werden.");
  }

  const note = input.reason?.trim() || null;
  const { error: updErr } = await admin
    .from("membership_applications")
    .update({ status: "rejected", admin_notes: note })
    .eq("id", input.applicationId);
  if (updErr) throw new Error(updErr.message);

  if (app.user_id) {
    await admin
      .from("memberships")
      .update({ status: "inactive" })
      .eq("user_id", app.user_id);
  }

  await logMemberActivity({
    userId: app.user_id,
    applicationId: app.id,
    eventType: MEMBER_ACTIVITY_TYPES.applicationRejected,
    title: "Mitgliedsantrag abgelehnt",
    details: note ?? "Antrag wurde nicht angenommen.",
    createdBy: user.id,
  });

  await auditLog({
    actorId: user.id,
    action: "application.reject",
    entityType: "membership_application",
    entityId: input.applicationId,
    summary: "Mitgliedsantrag abgelehnt",
  });

  revalidatePath("/admin/members");
  return { ok: true };
}

function deleteApplicationErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen";
  if (/Server Components render|digest property/i.test(msg)) {
    return "Antrag konnte nicht gelöscht werden. Bitte Seite neu laden und erneut versuchen.";
  }
  return msg;
}

export async function deleteMembershipApplication(
  applicationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdminAction();
    const admin = createSupabaseAdminClient();

    const { data: app, error: appErr } = await admin
      .from("membership_applications")
      .select("id,user_id,first_name,last_name")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) return { ok: false, error: appErr.message };
    if (!app) return { ok: false, error: "Antrag nicht gefunden." };

    if (app.user_id) {
      await logMemberActivity({
        userId: app.user_id,
        applicationId: app.id,
        eventType: MEMBER_ACTIVITY_TYPES.applicationDeleted,
        title: "Mitgliedsantrag vollständig gelöscht",
        details: `${app.first_name} ${app.last_name} — inkl. Dateien und Testdaten.`,
        createdBy: user.id,
      }).catch(() => {});
    }

    await deleteMembershipApplicationCompletely(admin, applicationId);
    await auditLog({
      actorId: user.id,
      action: "application.delete",
      entityType: "membership_application",
      entityId: applicationId,
      summary: `Mitgliedsantrag gelöscht: ${app.first_name} ${app.last_name}`,
    });
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/applications/${applicationId}`);
    return { ok: true };
  } catch (e) {
    console.error("[application.delete]", e);
    return { ok: false, error: deleteApplicationErrorMessage(e) };
  }
}
