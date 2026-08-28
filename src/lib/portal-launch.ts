/**
 * Soft-Launch / Go-Live: volle Nutzung ab 16.08.2026, 10:00 Europe/Berlin (CEST = UTC+2).
 *
 * Bis dahin (Soft-Launch): Mitglieder dürfen umschauen und bereits
 *   - Profil/Stammdaten (inkl. Avatar) bearbeiten
 *   - Willkommen-/Kennenlern-Fragen beantworten
 *   - im Gruppenchat schreiben
 *   - unter Geburtstags-Beiträgen im Feed kommentieren/reagieren
 *
 * Gesperrt bis Go-Live: eigene Posts, allgemeine Kommentare/Reaktionen, Umfragen,
 * Gewinnspiele, Termin-Zusagen, Live-Schreiben usw. Admins sind von der Schreibsperre ausgenommen.
 *
 * Stille Vorschau-Konten (browse-only): dauerhaft nur lesen, unabhängig vom Go-Live.
 */

import { isBrowseOnlyProfileId } from "@/lib/members/hidden";

/** 16.08.2026 10:00 Europe/Berlin = 08:00 UTC */
export const PORTAL_FULL_LAUNCH_AT_ISO = "2026-08-16T08:00:00.000Z";
export const PORTAL_FULL_LAUNCH_AT_MS = Date.parse(PORTAL_FULL_LAUNCH_AT_ISO);

export const PORTAL_LAUNCH_LABEL_DE = "16.08.2026 um 10:00";

/** Für Community-Schreiben (Posts, Kommentare, Umfragen, Gewinnspiele, …). */
export const BROWSE_ONLY_WRITE_BLOCKED_MESSAGE =
  `Offizieller Start am ${PORTAL_LAUNCH_LABEL_DE}. Bis dahin sind eigene Posts, allgemeine Kommentare, Umfragen und Gewinnspiele noch gesperrt — Profil, Kennenlernen, Chat und Geburtstagsgratulationen sind schon frei.`;

export const SPECTATOR_WRITE_BLOCKED_MESSAGE =
  "Dieses Konto ist nur zum Anschauen — Kommentare, Likes und Mitmachen sind nicht möglich.";

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

export function writeBlockedMessageFor(userId?: string | null): string {
  if (isBrowseOnlyProfileId(userId)) return SPECTATOR_WRITE_BLOCKED_MESSAGE;
  return BROWSE_ONLY_WRITE_BLOCKED_MESSAGE;
}

/**
 * Community-Schreiben (Feed, Kommentare, Umfragen, Gewinnspiele, RSVP, Live …).
 * Soft-Launch: nur Admins. Chat/Profil/Intro/Geburtstagsposts haben eigene Freigabe.
 * Vorschau-Konten: nie.
 */
export function canMemberWrite(
  role: string | null | undefined,
  now: Date | number = Date.now(),
  userId?: string | null,
): boolean {
  if (isBrowseOnlyProfileId(userId)) return false;
  if (isAdminRole(role)) return true;
  return isPortalFullyLive(now);
}

/** Gruppenchat: bereits im Soft-Launch für alle Mitglieder freigeschaltet. Vorschau-Konten: nie. */
export function canMemberChat(
  role: string | null | undefined,
  _now: Date | number = Date.now(),
  userId?: string | null,
): boolean {
  void role;
  void _now;
  if (isBrowseOnlyProfileId(userId)) return false;
  return true;
}

/**
 * Geburtstags-Beiträge im Feed: für alle Mitglieder sichtbar und schon im Soft-Launch
 * kommentier-/reagierbar (Gratulationen zur Community gehören zum Soft-Launch).
 */
export function canMemberEngageBirthdayPost(
  role: string | null | undefined,
  _now: Date | number = Date.now(),
  userId?: string | null,
): boolean {
  void role;
  void _now;
  if (isBrowseOnlyProfileId(userId)) return false;
  return true;
}

/** Profil, Avatar und Kennenlern-/Willkommen-Fragen: Soft-Launch erlaubt. Vorschau-Konten: nie. */
export function canMemberEditProfileAndIntro(
  role: string | null | undefined,
  _now: Date | number = Date.now(),
  userId?: string | null,
): boolean {
  void role;
  void _now;
  if (isBrowseOnlyProfileId(userId)) return false;
  return true;
}

export function assertMemberCanWrite(
  role: string | null | undefined,
  now: Date | number = Date.now(),
  userId?: string | null,
): void {
  if (!canMemberWrite(role, now, userId)) {
    throw new Error(writeBlockedMessageFor(userId));
  }
}
