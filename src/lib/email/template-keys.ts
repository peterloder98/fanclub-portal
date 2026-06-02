export const EMAIL_TEMPLATE_KEYS = {
  membershipApplicationReceived: "membership_application_received",
  membershipApplicationAdminNotify: "membership_application_admin_notify",
  membershipPaymentReminder: "membership_payment_reminder",
} as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[keyof typeof EMAIL_TEMPLATE_KEYS];

export const TEMPLATE_PLACEHOLDERS: Record<
  EmailTemplateKey,
  { key: string; label: string }[]
> = {
  [EMAIL_TEMPLATE_KEYS.membershipApplicationReceived]: [
    { key: "first_name", label: "Vorname" },
    { key: "last_name", label: "Nachname" },
    { key: "applicant_name", label: "Vollständiger Name" },
    { key: "email", label: "E-Mail Antragsteller" },
    { key: "fee_eur", label: "Beitrag (z. B. 15,00 EUR)" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.membershipApplicationAdminNotify]: [
    { key: "applicant_name", label: "Name Antragsteller" },
    { key: "email", label: "E-Mail Antragsteller" },
    { key: "application_id", label: "Antrags-ID" },
    { key: "admin_applications_url", label: "Link Anträge (Admin)" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.membershipPaymentReminder]: [
    { key: "first_name", label: "Vorname" },
    { key: "last_name", label: "Nachname" },
    { key: "applicant_name", label: "Vollständiger Name" },
    { key: "email", label: "E-Mail" },
    { key: "fee_eur", label: "Beitrag (z. B. 15,00 EUR)" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
};
