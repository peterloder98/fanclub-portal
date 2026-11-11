/** Marker für automatisch geschlossene Doppel-Prüfungen (ohne Vorstandsentscheidung). */
export const REFERRAL_REVIEW_AUTO_CLOSE_PREFIX = "Automatisch geschlossen:";

export const REFERRAL_REVIEW_AUTO_CLOSE_NOTE =
  "Automatisch geschlossen: dieselben Einladungen wurden schon geprüft. Keine neue Entscheidung und keine Änderung an den Sternen.";

export function isAutoClosedReferralReview(
  status: string,
  adminNote: string | null | undefined,
): boolean {
  if (status === "dismissed") return true;
  return (adminNote ?? "").startsWith(REFERRAL_REVIEW_AUTO_CLOSE_PREFIX);
}

/** Anzeige in „Erledigte Prüfungen“. Automatisch geschlossene Doppel fallen nicht unter freigegeben/zurückgenommen. */
export function referralReviewStatusLabel(
  status: string,
  adminNote?: string | null,
): string {
  if (isAutoClosedReferralReview(status, adminNote)) return "geschlossen (bereits geprüft)";
  if (status === "released") return "freigegeben";
  if (status === "clawed_back") return "zurückgenommen";
  if (status === "open") return "offen";
  return "erledigt";
}
