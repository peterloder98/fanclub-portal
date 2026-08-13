/**
 * Soft-Launch / Go-Live: volle Nutzung ab 16.08.2026, 10:00 Europe/Berlin (CEST = UTC+2).
 *
 * Bis dahin (Soft-Launch): Mitglieder dürfen umschauen und bereits
 *   - Profil/Stammdaten (inkl. Avatar) bearbeiten
 *   - Willkommen-/Kennenlern-Fragen beantworten
 *   - im Gruppenchat schreiben
 *
 * Gesperrt bis Go-Live: Posts, Kommentare, Reaktionen, Umfragen, Gewinnspiele,
 * Termin-Zusagen, Live-Schreiben usw. Admins sind von der Schreibsperre ausgenommen.
 */

/** 16.08.2026 10:00 Europe/Berlin = 08:00 UTC */
export const PORTAL_FULL_LAUNCH_AT_ISO = "2026-08-16T08:00:00.000Z";
export const PORTAL_FULL_LAUNCH_AT_MS = Date.parse(PORTAL_FULL_LAUNCH_AT_ISO);

export const PORTAL_LAUNCH_LABEL_DE = "16.08.2026 um 10:00";

/** Für Community-Schreiben (Posts, Kommentare, Umfragen, Gewinnspiele, …). */
export const BROWSE_ONLY_WRITE_BLOCKED_MESSAGE =
  `Offizieller Start am ${PORTAL_LAUNCH_LABEL_DE}. Bis dahin sind Posts, Kommentare, Umfragen und Gewinnspiele noch gesperrt — Profil, Kennenlernen und Chat sind schon frei.`;

export function isPortalFullyLive(now: Date | number = Date.now()): boolean {
  const t = typeof now === "number" ? now : now.getTime();
  return t >= PORTAL_FULL_LAUNCH_AT_MS;
}

/** Soft-Launch: nach Anmeldung, aber vor dem offiziellen Start. */
export function isBrowseOnlyMode(now: Date | number = Date.now()): boolean {
  return !isPortalFullyLive(now);
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/**
 * Community-Schreiben (Feed, Kommentare, Umfragen, Gewinnspiele, RSVP, Live …).
 * Soft-Launch: nur Admins. Chat/Profil/Intro haben eigene Freigabe (immer erlaubt).
 */
export function canMemberWrite(role: string | null | undefined, now: Date | number = Date.now()): boolean {
  if (isAdminRole(role)) return true;
  return isPortalFullyLive(now);
}

/** Gruppenchat: bereits im Soft-Launch für alle Mitglieder freigeschaltet. */
export function canMemberChat(role: string | null | undefined, _now: Date | number = Date.now()): boolean {
  void role;
  void _now;
  return true;
}

/** Profil, Avatar und Kennenlern-/Willkommen-Fragen: Soft-Launch erlaubt. */
export function canMemberEditProfileAndIntro(
  role: string | null | undefined,
  _now: Date | number = Date.now(),
): boolean {
  void role;
  void _now;
  return true;
}

export function assertMemberCanWrite(role: string | null | undefined, now: Date | number = Date.now()): void {
  if (!canMemberWrite(role, now)) {
    throw new Error(BROWSE_ONLY_WRITE_BLOCKED_MESSAGE);
  }
}
