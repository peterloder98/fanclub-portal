import { loadApplicationPdfBytes } from "@/lib/membership/application-pdf-service";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailWithLog } from "@/lib/email/send-log";
import { emailPersonVars } from "@/lib/email/salutation-block";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";
import { formatApplicationPaymentReference } from "@/lib/payments/club-bank";
import { rotateAccountSetupToken } from "@/lib/auth/account-setup-token";
import { resolveOfficialFanclubEmail } from "@/lib/email/official-fanclub-email";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
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
  const to = await resolveOfficialFanclubEmail();
  if (!to) {
    console.warn("[email] Keine offizielle Fanclub-E-Mail für Antrags-Benachrichtigung.");
    return { sent: false, reason: "no_official_email" as const };
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

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApplicationAdminNotify,
    {
      admin_first_name: "Vorstand",
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
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: attachments.length ? attachments : undefined,
    templateKey: EMAIL_TEMPLATE_KEYS.membershipApplicationAdminNotify,
    context: { application_id: input.applicationId },
    bypassTestAllowlist: true,
  });

  if (!result.ok) {
    return {
      sent: false,
      reason: ("error" in result && result.error ? "send_failed" : "no_smtp_account") as
        | "send_failed"
        | "no_smtp_account",
      error: "error" in result ? result.error : undefined,
    };
  }

  return { sent: true as const, count: 1 };
}

export async function sendApplicantConfirmationEmail(input: {
  applicationId: string;
  email: string;
  firstName: string;
  lastName?: string;
  gender?: string | null;
  feeCents?: number;
}) {
  const pdfBytes = await loadApplicationPdfBytes(input.applicationId);
  const feeEur = `${((input.feeCents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const applicantName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const person = emailPersonVars({ firstName: input.firstName, gender: input.gender });
  // Mitgliedsseitig immer: „Mitgliedsbeitrag / Vorname Nachname“ (nie MITGLIED-…).
  const bankReference = formatApplicationPaymentReference(
    input.firstName,
    input.lastName ?? "",
  );

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApplicationReceived,
    {
      ...person,
      last_name: input.lastName ?? "",
      applicant_name: applicantName || input.firstName,
      email: input.email,
      fee_eur: feeEur,
      ...clubBankEmailVars({ bankReference }),
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

/**
 * Nach Freigabe: Willkommen + Mitgliedsnummer + App-Zugang einrichten
 * (stabiler Setup-Link wie Go-Live-Mail).
 */
export async function sendMemberInviteAfterApproval(input: {
  email: string;
  firstName: string;
  membershipNumber: string;
  gender?: string | null;
  userId?: string;
}) {
  const { setupUrl, userId } = await rotateAccountSetupToken({
    email: input.email,
    userId: input.userId,
  });
  const person = emailPersonVars({
    firstName: input.firstName,
    gender: input.gender,
  });

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipApprovedWelcome,
    {
      ...person,
      membership_number: input.membershipNumber,
      setup_url: setupUrl,
      invite_url: setupUrl,
    },
  );

  const result = await sendEmailWithLog({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments: rendered.signatureAttachment
      ? [rendered.signatureAttachment]
      : undefined,
    templateKey: EMAIL_TEMPLATE_KEYS.membershipApprovedWelcome,
    context: {
      membership_number: input.membershipNumber,
      user_id: userId,
      setup_path: "/setup-account",
      setup_token: true,
    },
    bypassTestAllowlist: true,
  });

  return { ...result, setupUrl };
}
