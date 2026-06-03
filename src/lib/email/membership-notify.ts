import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadApplicationPdfBytes } from "@/lib/membership/application-pdf-service";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";

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

    const result = await sendEmailViaAccount({
      to: adm.email!.trim(),
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: attachments.length ? attachments : undefined,
    });

    if (result.ok) sentCount += 1;
  }

  if (sentCount === 0) {
    return { sent: false, reason: "no_smtp_account" as const };
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

  const result = await sendEmailViaAccount({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    attachments,
  });

  return result;
}

export async function sendMemberInviteAfterApproval(input: {
  email: string;
  firstName: string;
}) {
  const admin = createSupabaseAdminClient();
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: input.email,
  });
  if (linkErr) throw new Error(linkErr.message);

  const inviteUrl = linkData.properties.action_link;
  const subject = "Fanclub: Zugang zur App freigeschaltet";
  const text = [
    `Hallo ${input.firstName},`,
    ``,
    `deine Mitgliedschaft wurde freigeschaltet. Du kannst dich jetzt in der Fanclub-App anmelden:`,
    inviteUrl,
    ``,
    `Bitte setze über den Link dein Passwort und melde dich danach an.`,
  ].join("\n");

  const result = await sendEmailViaAccount({ to: input.email, subject, text });
  return { ...result, inviteUrl };
}
