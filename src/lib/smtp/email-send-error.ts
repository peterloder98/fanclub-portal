/** Klare deutsche Meldung aus sendEmailViaAccount / sendEmailWithLog. */
export function describeEmailSendFailure(result: {
  skipped?: boolean;
  reason?: string;
  error?: string;
}): string {
  if (result.skipped) {
    const reason = result.reason ?? "";
    if (reason === "no_smtp_account") {
      return "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).";
    }
    if (/outbound_test_mode/i.test(reason)) {
      return "E-Mail blockiert: Testmodus aktiv (Empfänger nicht freigegeben). Für echte Einladungen EMAIL_OUTBOUND_MODE=live setzen.";
    }
    return `E-Mail wurde nicht gesendet${reason ? ` (${reason})` : ""}.`;
  }
  return result.error?.trim() || "E-Mail konnte nicht gesendet werden (SMTP prüfen).";
}
