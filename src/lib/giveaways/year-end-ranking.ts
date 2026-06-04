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
  "Bei gleicher Punktzahl zählen nacheinander: mehr einzelne Punkte-Aktivitäten im Jahr, niedrigere Mitgliedsnummer, früheres Mitgliedschafts-Datum, dann Name alphabetisch.";

function membershipNumberSortKey(n: string | null): number {
  if (!n?.trim()) return Number.MAX_SAFE_INTEGER;
  const digits = n.replace(/\D/g, "");
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function nameSortKey(c: YearEndCandidate) {
  return `${(c.last_name ?? "").trim().toLowerCase()}|${(c.first_name ?? "").trim().toLowerCase()}`;
}

/** Größer = besser (für sort desc). */
export function compareYearEndCandidates(a: YearEndCandidate, b: YearEndCandidate): number {
  if (b.total !== a.total) return b.total - a.total;
  if (b.activityCount !== a.activityCount) return b.activityCount - a.activityCount;

  const numA = membershipNumberSortKey(a.membership_number);
  const numB = membershipNumberSortKey(b.membership_number);
  if (numA !== numB) return numA - numB;

  const startA = a.membership_start ?? "9999-12-31";
  const startB = b.membership_start ?? "9999-12-31";
  if (startA !== startB) return startA.localeCompare(startB);

  return nameSortKey(a).localeCompare(nameSortKey(b), "de");
}

export function rankYearEndTopN(candidates: YearEndCandidate[], limit: number): YearEndCandidate[] {
  if (limit < 1) return [];
  return [...candidates].sort(compareYearEndCandidates).slice(0, limit);
}
