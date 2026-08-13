const RATE_LIMIT_DE =
  "Zu viele Versuche. Bitte warte einige Minuten oder melde dich beim Vorstand — wir schicken dir den Link manuell.";

/**
 * Mappt Supabase-Auth-Fehlermeldungen (oft Englisch) auf verständliches Deutsch.
 */
export function mapAuthErrorMessage(
  message: string | null | undefined,
  fallback = "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
): string {
  const raw = (message ?? "").trim();
  if (!raw) return fallback;

  if (/rate.?limit|email rate limit exceeded|over_email_send_rate_limit/i.test(raw)) {
    return RATE_LIMIT_DE;
  }

  return raw;
}

export function mapAuthError(
  err: unknown,
  fallback = "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
): string {
  if (err instanceof Error) return mapAuthErrorMessage(err.message, fallback);
  if (typeof err === "string") return mapAuthErrorMessage(err, fallback);
  return fallback;
}
