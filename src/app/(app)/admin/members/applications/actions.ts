"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { CLUB_SIGNATURE_ID, listMailSignatureOptions } from "@/lib/email/signatures";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import {
  logMemberActivity,
  listMemberActivity,
  MEMBER_ACTIVITY_TYPES,
} from "@/lib/membership/activity-log";
import { deleteMembershipApplicationCompletely } from "@/lib/membership/delete-application";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";

async function activateApplication(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  applicationId: string,
  membershipNumber?: string,
  createdBy?: string,
) {
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,email,first_name,last_name,status,fee_cents")
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Antrag nicht gefunden.");
  if (!app.user_id) {
    throw new Error("Kein Benutzerkonto verknüpft — Antrag kann nicht freigeschaltet werden.");
  }

  if (membershipNumber?.trim()) {
    const { error: pErr } = await admin
      .from("profiles")
      .update({ membership_number: membershipNumber.trim() })
      .eq("id", app.user_id);
    if (pErr) throw new Error(pErr.message);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("membership_number")
    .eq("id", app.user_id)
    .maybeSingle();

  if (!profile?.membership_number?.trim()) {
    throw new Error("Bitte zuerst eine Mitgliedsnummer vergeben.");
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("id,status")
    .eq("user_id", app.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.id) throw new Error("Mitgliedschaft nicht gefunden.");

  const { error: mErr } = await admin
    .from("memberships")
    .update({ status: "active" })
    .eq("id", membership.id);
  if (mErr) throw new Error(mErr.message);

  await admin
    .from("membership_applications")
    .update({ status: "approved" })
    .eq("id", applicationId);

  await admin.auth.admin.updateUserById(app.user_id, { email_confirm: true });

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  await logMemberActivity({
    userId: app.user_id,
    applicationId,
    eventType: MEMBER_ACTIVITY_TYPES.membershipApproved,
    title: "Mitgliedschaft freigegeben",
    details: `Mitgliedsnummer ${profile.membership_number}. Status: aktiv.`,
    linkUrl: base ? `${base}/admin/members` : null,
    linkLabel: "Mitgliederliste",
    createdBy,
  }).catch(console.error);

  if (app.email) {
    await sendMemberInviteAfterApproval({
      email: app.email,
      firstName: app.first_name?.trim() || "Fan",
    }).catch((e) => {
      console.error("[membership] Freischaltungs-Mail fehlgeschlagen:", e);
    });
  }

  return app;
}

export async function approveMembershipApplication(applicationId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  await activateApplication(admin, applicationId);
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/applications/${applicationId}`);
  redirect(`/admin/members/applications/${applicationId}?approved=1`);
}

export async function approveMembershipApplicationWithNumber(
  applicationId: string,
  membershipNumber: string,
) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  await activateApplication(admin, applicationId, membershipNumber, user.id);
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function getPaymentReminderDraft(
  applicationId: string,
  signatureId?: string,
) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,first_name,last_name,email,fee_cents")
    .eq("id", applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app?.email) throw new Error("Antrag oder E-Mail nicht gefunden.");

  const signatures = await listMailSignatureOptions();
  const defaultSignatureId =
    signatures.find((s) => s.id === user.id)?.id ??
    signatures.find((s) => s.kind === "board")?.id ??
    CLUB_SIGNATURE_ID;
  const useSignatureId = signatureId ?? defaultSignatureId;

  const feeEur = `${((app.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: app.first_name?.trim() || "Fan",
      last_name: app.last_name?.trim() || "",
      applicant_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
      email: app.email,
      fee_eur: feeEur,
    },
    { signatureId: useSignatureId },
  );

  return {
    subject: rendered.subject,
    body: rendered.text,
    to: app.email,
    signatures,
    defaultSignatureId: useSignatureId,
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
    .select("id,user_id,email,first_name,last_name,fee_cents")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (appErr) throw new Error(appErr.message);
  if (!app?.email) throw new Error("E-Mail des Antragstellers fehlt.");

  const feeEur = `${((app.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: app.first_name?.trim() || "Fan",
      last_name: app.last_name?.trim() || "",
      applicant_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
      email: app.email,
      fee_eur: feeEur,
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
    ? buildHtmlFromPlain(text, rendered.html)
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
}) {
  const { user } = await requireAdminAction();
  if (!input.userId && !input.applicationId) {
    throw new Error("userId oder applicationId erforderlich.");
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

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function deleteMembershipApplication(applicationId: string) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: app } = await admin
    .from("membership_applications")
    .select("id,user_id,first_name,last_name")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app) throw new Error("Antrag nicht gefunden.");

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
  revalidatePath("/admin/members");
  return { ok: true };
}
