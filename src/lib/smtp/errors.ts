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
      "Wenn der Login im Webmail klappt, der SMTP-Test aber nicht, liegt es fast immer an web.de:\n" +
      "• Bei Zwei-Faktor-Authentifizierung (2FA): Im Webmail normales Passwort — für SMTP/App ein anwendungsspezifisches Passwort nötig.\n" +
      "  web.de → Account verwalten → Login & Sicherheit → Anwendungsspezifische Passwörter → neu erstellen.\n" +
      "  In der App dieses Passwort eintragen (nicht das Webmail-Passwort).\n" +
      "• POP3/IMAP/SMTP-Zugriff muss unter Einstellungen → E-Mail-Programme aktiv sein.\n" +
      "• Host smtp.web.de, Port 587, Verschlüsselung STARTTLS (oder Port 465 + SSL).\n" +
      "• Login = vollständige Adresse (…@web.de).\n" +
      "• Kurz in Thunderbird/Outlook testen: klappt es dort nur mit App-Passwort, ist die Lösung bestätigt."
    );
  }

  return msg || "SMTP-Fehler";
}

export type SmtpActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : T))
  | { ok: false; error: string };
