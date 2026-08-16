export function formatMembershipEmailWarning(parts: {
  applicant?: { ok: boolean; skipped?: boolean; error?: string; reason?: string };
  admin?: { sent: boolean; reason?: string; error?: string };
}): string | null {
  const messages: string[] = [];

  if (parts.applicant) {
    if (parts.applicant.skipped) {
      const reason = parts.applicant.reason ?? parts.applicant.error ?? "";
      if (/outbound_test_mode/i.test(reason)) {
        messages.push(
          "Bestätigungs-E-Mail: Im Testmodus blockiert (Empfänger nicht auf der Allowlist). Für echte Mitglieder-Mails EMAIL_OUTBOUND_MODE=live setzen.",
        );
      } else if (reason === "no_smtp_account" || !reason) {
        messages.push(
          "Bestätigungs-E-Mail: Kein SMTP-Konto hinterlegt (Admin → E-Mail-Einstellungen).",
        );
      } else {
        messages.push(`Bestätigungs-E-Mail übersprungen (${reason}).`);
      }
    } else if (!parts.applicant.ok) {
      messages.push(
        parts.applicant.error?.includes("SMTP_SECRET")
          ? "Bestätigungs-E-Mail: SMTP_SECRET auf dem Server fehlt oder ist falsch."
          : `Bestätigungs-E-Mail konnte nicht gesendet werden${parts.applicant.error ? ` (${parts.applicant.error})` : ""}.`,
      );
    }
  }

  if (parts.admin && !parts.admin.sent) {
    if (parts.admin.reason === "no_admin_emails" || parts.admin.reason === "no_official_email") {
      messages.push(
        "Admin-Benachrichtigung: Keine offizielle Fanclub-E-Mail konfiguriert (SMTP/Env).",
      );
    } else if (parts.admin.reason === "no_smtp_account") {
      messages.push("Admin-Benachrichtigung: Kein SMTP-Konto konfiguriert.");
    } else if (parts.admin.reason && /outbound_test_mode/i.test(parts.admin.reason)) {
      messages.push(
        "Admin-Benachrichtigung: Im Testmodus blockiert (Allowlist). Live-Versand: EMAIL_OUTBOUND_MODE=live.",
      );
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
