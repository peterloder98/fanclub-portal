const REASON_LABELS: Record<string, string> = {
  membership_referral: "Mitglied empfohlen (E-Mail)",
  membership_referral_completed: "Empfehlung erfolgreich (Freischaltung)",
  poll_vote: "Umfrage",
  post_comment: "Kommentar im Feed",
  post_like: "Beitrag geliked",
  giveaway_entry: "Gewinnspiel",
  giveaway_like: "Gewinnspiel geliked",
  giveaway_comment: "Kommentar Gewinnspiel",
  event_participation: "Event-Teilnahme",
};

export function pointsReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}
