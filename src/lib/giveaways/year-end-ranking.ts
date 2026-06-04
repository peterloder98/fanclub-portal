/** Top-10 Jahresend — feste Reihenfolge bei Punktgleichstand (kein Zufall). */

export type YearEndCandidate = {
  user_id: string;
  total: number;
  activityCount: number;
  membership_number: string | null;
  membership_start: string | null;
  last_name: string;
  first_name: string;
};

export const YEAR_END_TIE_BREAK_SUMMARY =
  "Bei gleicher Punktzahl zählen nacheinander: mehr einzelne Punkte-Aktivitäten im Jahr, früheres Eintrittsdatum, im Notfall Nachname alphabetisch.";

/** Größer = besser (für sort desc). */
export function compareYearEndCandidates(a: YearEndCandidate, b: YearEndCandidate): number {
  if (b.total !== a.total) return b.total - a.total;
  if (b.activityCount !== a.activityCount) return b.activityCount - a.activityCount;

  const startA = a.membership_start ?? "9999-12-31";
  const startB = b.membership_start ?? "9999-12-31";
  if (startA !== startB) return startA.localeCompare(startB);

  const lastA = (a.last_name ?? "").trim().toLowerCase();
  const lastB = (b.last_name ?? "").trim().toLowerCase();
  return lastA.localeCompare(lastB, "de");
}

export function rankYearEndTopN(candidates: YearEndCandidate[], limit: number): YearEndCandidate[] {
  if (limit < 1) return [];
  return [...candidates].sort(compareYearEndCandidates).slice(0, limit);
}
