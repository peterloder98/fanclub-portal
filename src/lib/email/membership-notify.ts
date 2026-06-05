import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadApplicationPdfBytes } from "@/lib/membership/application-pdf-service";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function formatSubmittedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export async function notifyAdminsNewMembershipApplication(input: {
  applicationId: string;
  applicantName: string;
  email: string;
  submittedAt: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name")
    .eq("role", "admin")
    .not("email", "is", null);

  const recipients = (admins ?? []).filter((a) => a.email?.trim());
  if (!recipients.length) {
    console.warn("[email] Keine Admin-E-Mail-Adressen gefunden.");
    return { sent: false, reason: "no_admin_emails" as const };
  }

  const base = appBaseUrl();
  const applicationAdminUrl = base
    ? `${base}/admin/members/applications/${input.applicationId}`
    : `/admin/members/applications/${input.applicationId}`;
  const adminApplicationsUrl = base ? `${base}/admin/members` : "/admin/members";
  const submittedAtLabel = formatSubmittedAt(input.submittedAt);

  let pdfBytes: Uint8Array | null = null;
  try {
    pdfBytes = await loadApplicationPdfBytes(input.applicationId);
  } catch (e) {
    console.error("[email] PDF für Admin-Mail konnte nicht erzeugt werden:", e);
  }

  const pdfAttachment = pdfBytes
    ? {
        filename: `Mitgliedsantrag_${input.applicantName.replace(/\s+/g, "_")}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      }
    : null;

  let sentCount = 0;
  let lastError: string | undefined;
  for (const adm of recipients) {
    const adminFirst =
      adm.first_name?.trim() || adm.last_name?.trim() || "Vorstand";

    const rendered = await renderEmailFromTemplate(
      EMAIL_TEMPLATE_KEYS.membershipApplicationAdminNotify,
      {
        admin_first_name: adminFirst,
        applicant_name: input.applicantName,
        email: input.email,
        application_id: input.applicationId,
        submitted_at: submittedAtLabel,
        application_admin_url: applicationAdminUrl,
        admin_applications_url: adminApplicationsUrl,
      },
    );

    const attachments = [
      ...(pdfAttachment ? [pdfAttachment] : []),
      ...(rendered.signatureAttachment ? [rendered.signatureAttachment] : []),
    ];

    const result = await sendEmailWithLog({
      to: adm.email!.trim(),
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: attachments.length ? attachments : undefined,
      templateKey: EMAIL_TEMPLATE_KEYS.membershipApplicationAdminNotify,
      context: { application_id: input.applicationId },
    });

    if (result.ok) sentCount += 1;
    else if ("error" in result && result.error) lastError = result.error;
  }

  if (sentCount === 0) {
    return {
      sent: false,
      reason: lastError ? ("send_failed" as const) : ("no_smtp_account" as const),
      error: lastError,
    };
  }

  return { sent: true as const, count: sentCount };
}

export async function sendApplicantConfirmationEmail(input: {
  applicationId: string;
  email: string;
  firstName: string;
  lastName?: string;
  feeCents?: number;
}) {
  const pdfBytes = await loadApplicationPdfBytes(input.applicationId);
  const feeEur = `${((input.feeCents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const applicantName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApplicationReceived,
    {
      first_name: input.firstName,
      last_name: input.lastName ?? "",
      applicant_name: applicantName || input.firstName,
      email: input.email,
      fee_eur: feeEur,
    },
  );

  const attachments = [
    {
      filename: "Mitgliedsantrag_mit_Satzung.pdf",
      content: Buffer.from(pdfBytes),
      contentType: "application/pdf",
    },
    ...(rendered.signatureAttachment ? [rendered.signatureAttachment] : []),
  ];

  return sendEmailWithLog({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments,
    templateKey: EMAIL_TEMPLATE_KEYS.membershipApplicationReceived,
    context: { application_id: input.applicationId },
  });
}

export async function sendMemberInviteAfterApproval(input: {
  email: string;
  firstName: string;
  membershipNumber: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: input.email,
  });
  if (linkErr) throw new Error(linkErr.message);

  const inviteUrl = linkData.properties.action_link;

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApprovedWelcome,
    {
      first_name: input.firstName,
      membership_number: input.membershipNumber,
      invite_url: inviteUrl,
    },
  );

  const result = await sendEmailWithLog({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment ? [rendered.signatureAttachment] : undefined,
    templateKey: EMAIL_TEMPLATE_KEYS.membershipApprovedWelcome,
    context: { membership_number: input.membershipNumber },
  });
  return { ...result, inviteUrl };
}
