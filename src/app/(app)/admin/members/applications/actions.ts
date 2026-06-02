"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

async function activateApplication(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  applicationId: string,
  membershipNumber?: string,
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
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  await activateApplication(admin, applicationId, membershipNumber);
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

export async function getPaymentReminderDraft(applicationId: string) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: app } = await admin
    .from("membership_applications")
    .select("first_name,last_name,email,fee_cents")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app?.email) throw new Error("Antrag oder E-Mail nicht gefunden.");

  const feeEur = `${((app.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.membershipPaymentReminder, {
    first_name: app.first_name?.trim() || "Fan",
    last_name: app.last_name?.trim() || "",
    applicant_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
    email: app.email,
    fee_eur: feeEur,
  });

  return { subject: rendered.subject, body: rendered.text, to: app.email };
}

export async function sendPaymentReminderEmail(input: {
  applicationId: string;
  subject: string;
  body: string;
}) {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: app } = await admin
    .from("membership_applications")
    .select("email,first_name,last_name,fee_cents")
    .eq("id", input.applicationId)
    .maybeSingle();
  if (!app?.email) throw new Error("E-Mail des Antragstellers fehlt.");

  const feeEur = `${((app.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const rendered = await renderEmailFromTemplate(EMAIL_TEMPLATE_KEYS.membershipPaymentReminder, {
    first_name: app.first_name?.trim() || "Fan",
    last_name: app.last_name?.trim() || "",
    applicant_name: `${app.first_name ?? ""} ${app.last_name ?? ""}`.trim(),
    email: app.email,
    fee_eur: feeEur,
  });

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
    ? `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:24px"><div style="max-width:560px">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div></body></html>`
    : rendered.html;

  const result = await sendEmailViaAccount({
    to: app.email,
    subject,
    text,
    html,
    attachments,
  });

  if (!result.ok) {
    throw new Error("E-Mail konnte nicht gesendet werden (SMTP prüfen).");
  }

  revalidatePath("/admin/members");
  return { ok: true };
}
