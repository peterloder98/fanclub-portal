/** Versteckte Profile („Geist“): nicht in Mitglieder-UI / Ranglisten / Mentions; kein Profil-Link. */

export type HiddenFlag = { id?: string; is_hidden?: boolean | null; no_app_access?: boolean | null };

/**
 * Explizit freigegebene System-Accounts (zusätzlich zu profiles.is_hidden).
 * Andere Admins ohne diesen Eintrag / ohne Flag bleiben sichtbar.
 */
export const SYSTEM_HIDDEN_PROFILE_IDS = new Set<string>([
  "1b70d88f-e28d-48f3-b3cb-646eaf06f19a", // Peter Loder
]);

export function isHiddenProfileId(userId: string | null | undefined): boolean {
  return Boolean(userId && SYSTEM_HIDDEN_PROFILE_IDS.has(userId));
}

export function isProfileHidden(row: HiddenFlag | null | undefined): boolean {
  if (!row) return false;
  if (row.id && SYSTEM_HIDDEN_PROFILE_IDS.has(row.id)) return true;
  return Boolean(row.is_hidden || row.no_app_access);
}

/**
 * Öffentlicher Mitglieder-Portal-Pfad — `null` für Geister (Name darf sichtbar bleiben, Link nicht).
 * Eigenes Portal bleibt über Direkt-URL nur für den Account selbst erreichbar.
 */
export function memberProfileHref(userId: string | null | undefined): string | null {
  if (!userId || isHiddenProfileId(userId)) return null;
  return `/mitglieder/${userId}`;
}

export function excludeHiddenProfiles<T extends HiddenFlag>(
  rows: ReadonlyArray<T> | null | undefined,
): T[] {
  if (!rows || rows.length === 0) return [];
  return rows.filter((r) => !isProfileHidden(r));
}
