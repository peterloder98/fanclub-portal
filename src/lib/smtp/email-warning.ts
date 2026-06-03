export function formatMembershipEmailWarning(parts: {
  applicant?: { ok: boolean; skipped?: boolean; error?: string };
  admin?: { sent: boolean; reason?: string; error?: string };
}): string | null {
  const messages: string[] = [];

  if (parts.applicant) {
    if (parts.applicant.skipped) {
      messages.push(
        "Bestätigungs-E-Mail: Kein SMTP-Konto hinterlegt (Admin → E-Mail-Einstellungen).",
      );
    } else if (!parts.applicant.ok) {
      messages.push(
        parts.applicant.error?.includes("SMTP_SECRET")
          ? "Bestätigungs-E-Mail: SMTP_SECRET auf dem Server fehlt oder ist falsch."
          : `Bestätigungs-E-Mail konnte nicht gesendet werden${parts.applicant.error ? ` (${parts.applicant.error})` : ""}.`,
      );
    }
  }

  if (parts.admin && !parts.admin.sent) {
    if (parts.admin.reason === "no_admin_emails") {
      messages.push("Admin-Benachrichtigung: Keine Admin-E-Mail in den Profilen.");
    } else if (parts.admin.reason === "no_smtp_account") {
      messages.push("Admin-Benachrichtigung: Kein SMTP-Konto konfiguriert.");
    } else if (parts.admin.reason === "send_failed") {
      messages.push(
        parts.admin.error
          ? `Admin-Benachrichtigung fehlgeschlagen (${parts.admin.error}).`
          : "Admin-Benachrichtigung konnte nicht gesendet werden.",
      );
    }
  }

  return messages.length ? messages.join(" ") : null;
}
