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
      "Prüfe Host smtp.hostinger.com, Port 465, Verschlüsselung SSL. " +
      "Manche Hoster blockieren Verbindungen von Cloud-Servern — dann SMTP-Freigabe beim Provider anfragen."
    );
  }

  if (/Invalid login|authentication|535|534/i.test(msg)) {
    return (
      "SMTP-Anmeldung abgelehnt (535). Typische Ursachen:\n" +
      "• Falsches Passwort — bitte das Postfach-Passwort aus dem Hoster-Panel (z. B. Hostinger E-Mail-Konten), nicht das Login-Passwort der Website.\n" +
      "• Login muss die vollständige E-Mail-Adresse sein (z. B. fanclub@deine-domain.de).\n" +
      "• Bei Hostinger meist: Host smtp.hostinger.com, Port 465, Verschlüsselung SSL.\n" +
      "• Konto bearbeiten, Passwort erneut eintragen und speichern, danach „Test“."
    );
  }

  return msg || "SMTP-Fehler";
}

export type SmtpActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : T))
  | { ok: false; error: string };
