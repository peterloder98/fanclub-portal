export function formatSmtpError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  if (/SMTP_SECRET|decrypt|auth tag|Unsupported state/i.test(msg)) {
    return (
      "SMTP-Passwort konnte nicht entschlüsselt werden. Auf Vercel muss SMTP_SECRET exakt wie lokal gesetzt sein. " +
      "Danach im Admin das SMTP-Konto öffnen, Passwort erneut eintragen und speichern (oder SMTP_SEED_* in Vercel prüfen)."
    );
  }

  if (/Missing SUPABASE_SERVICE_ROLE_KEY/i.test(msg)) {
    return "SUPABASE_SERVICE_ROLE_KEY fehlt in den Vercel-Umgebungsvariablen.";
  }

  if (/ECONNREFUSED|ETIMEDOUT|ESOCKET|ETIMEOUT|Connection timeout|Greeting timeout/i.test(msg)) {
    return (
      `SMTP-Server nicht erreichbar (${msg}). ` +
      "Bei web.de: Host smtp.web.de, Port 587, Verschlüsselung STARTTLS. " +
      "Außerdem in den web.de-Einstellungen POP3/IMAP/SMTP-Zugriff freischalten."
    );
  }

  if (/Invalid login|authentication|535|534/i.test(msg)) {
    return (
      "SMTP-Anmeldung abgelehnt (535). Authentifizierung (AUTH LOGIN) ist in der App immer aktiv.\n" +
      "Bei web.de bitte prüfen:\n" +
      "• In web.de unter Einstellungen → E-Mail-Programme: POP3/IMAP/SMTP-Zugriff einschalten (sonst schlägt Login fehl).\n" +
      "• Host smtp.web.de, Port 587, Verschlüsselung STARTTLS (oder Port 465 + SSL).\n" +
      "• Login = vollständige Adresse (…@web.de), Passwort = dein web.de-Passwort.\n" +
      "• Konto bearbeiten, Passwort erneut speichern, danach „Test“."
    );
  }

  return msg || "SMTP-Fehler";
}

export type SmtpActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : T))
  | { ok: false; error: string };
