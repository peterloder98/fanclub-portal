import { getOutboundEmailMode } from "@/lib/email/outbound-policy";

/** Betreff / Kalender-Titel für Live-Sessions. */
export const LIVE_CALENDAR_TITLE = "Anni Perka Live Chat";

/** Kalender-Start: so viele Minuten vor dem echten Session-Start. */
export const LIVE_CALENDAR_EARLY_MINUTES = 5;

/**
 * Annis Empfängeradresse für Live-Einladung & Erinnerung.
 *
 * Go-Live: EMAIL_OUTBOUND_MODE=live → automatisch booking@anniperka.de
 * Bis dahin (Testmodus): mail@peter-loder.de
 * Override jederzeit: LIVE_ANNI_EMAIL=…
 */
export const LIVE_ANNI_EMAIL_PRODUCTION = "booking@anniperka.de";
export const LIVE_ANNI_EMAIL_TEST = "mail@peter-loder.de";

export function resolveLiveAnniEmail(): string {
  const override = process.env.LIVE_ANNI_EMAIL?.trim();
  if (override) return override.toLowerCase();
  return getOutboundEmailMode() === "live"
    ? LIVE_ANNI_EMAIL_PRODUCTION
    : LIVE_ANNI_EMAIL_TEST;
}

export function liveAnniEmailIsProductionTarget(): boolean {
  return resolveLiveAnniEmail().toLowerCase() === LIVE_ANNI_EMAIL_PRODUCTION;
}
