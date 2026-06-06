export const EMAIL_TEMPLATE_KEYS = {
  membershipApplicationReceived: "membership_application_received",
  membershipApplicationAdminNotify: "membership_application_admin_notify",
  membershipPaymentReminder: "membership_payment_reminder",
  membershipFormInvite: "membership_form_invite",
  giveawayEndedAdminNotify: "giveaway_ended_admin_notify",
  giveawayWinnerCongrats: "giveaway_winner_congrats",
  membershipApprovedWelcome: "membership_approved_welcome",
  clubMeetingReminder: "club_meeting_reminder",
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
    { key: "admin_first_name", label: "Vorname Admin (Empfänger)" },
    { key: "applicant_name", label: "Name Antragsteller" },
    { key: "email", label: "E-Mail Antragsteller" },
    { key: "submitted_at", label: "Antragsdatum + Uhrzeit" },
    { key: "application_id", label: "Antrags-ID" },
    { key: "application_admin_url", label: "Link Antragsdialog (Admin)" },
    { key: "admin_applications_url", label: "Link Mitgliederliste (Admin)" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.membershipPaymentReminder]: [
    { key: "first_name", label: "Vorname" },
    { key: "last_name", label: "Nachname" },
    { key: "applicant_name", label: "Vollständiger Name" },
    { key: "email", label: "E-Mail" },
    { key: "fee_eur", label: "Beitrag (z. B. 15,00 EUR)" },
    { key: "fee_paid_eur", label: "Bereits gezahlt" },
    { key: "fee_open_eur", label: "Offener Betrag" },
    { key: "membership_period", label: "Beitragszeitraum" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.membershipFormInvite]: [
    { key: "greeting_name", label: "Anrede (z. B. Vorname nach „Hey“)" },
    { key: "application_link", label: "Link zum Antragsformular" },
    { key: "fee_eur", label: "Beitrag (z. B. 15,00 EUR)" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.giveawayEndedAdminNotify]: [
    { key: "giveaway_title", label: "Titel Gewinnspiel" },
    { key: "giveaway_admin_url", label: "Link zur Auslosung (Admin)" },
  ],
  [EMAIL_TEMPLATE_KEYS.giveawayWinnerCongrats]: [
    { key: "first_name", label: "Vorname Gewinner" },
    { key: "giveaway_title", label: "Titel Gewinnspiel" },
    { key: "prize_name", label: "Preisname" },
    { key: "admin_signature_text", label: "Admin-Signatur (Text)" },
    { key: "admin_signature_block", label: "Admin-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.membershipApprovedWelcome]: [
    { key: "first_name", label: "Vorname" },
    { key: "membership_number", label: "Mitgliedsnummer" },
    { key: "invite_url", label: "Link Passwort setzen" },
    { key: "admin_signature_text", label: "Fanclub-Signatur (Text)" },
    { key: "admin_signature_block", label: "Fanclub-Signatur (HTML mit Bild)" },
  ],
  [EMAIL_TEMPLATE_KEYS.clubMeetingReminder]: [
    { key: "first_name", label: "Vorname" },
    { key: "meeting_title", label: "Titel Treffen" },
    { key: "meeting_date", label: "Datum & Uhrzeit" },
    { key: "meeting_location", label: "Ort" },
    { key: "meeting_url", label: "Link zur Treffen-Seite" },
    { key: "cost_hint", label: "Hinweis zu Kosten (oder leer)" },
    { key: "admin_signature_text", label: "Fanclub-Signatur (Text)" },
    { key: "admin_signature_block", label: "Fanclub-Signatur (HTML mit Bild)" },
  ],
};
