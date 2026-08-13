/** Versteckte Profile: nicht in Mitglieder-UI / Ranglisten / Mentions. */

export type HiddenFlag = { id?: string; is_hidden?: boolean | null };

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
  return Boolean(row.is_hidden);
}

export function excludeHiddenProfiles<T extends HiddenFlag>(
  rows: ReadonlyArray<T> | null | undefined,
): T[] {
  if (!rows || rows.length === 0) return [];
  return rows.filter((r) => !isProfileHidden(r));
}
