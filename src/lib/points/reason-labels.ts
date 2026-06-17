const REASON_LABELS: Record<string, string> = {
  membership_referral: "Mitglied empfohlen (E-Mail)",
  membership_referral_completed: "Empfehlung erfolgreich (Freischaltung)",
  poll_vote: "An Umfrage teilgenommen",
  radio_voting: "Radio-Voting mitgemacht",
  post_comment: "Beitrag kommentiert",
  birthday_comment: "Zum Geburtstag gratuliert",
  post_like: "Beitrag geliked",
  giveaway_entry: "An Gewinnspiel teilgenommen",
  giveaway_like: "Gewinnspiel geliked",
  giveaway_comment: "Kommentar Gewinnspiel",
  event_participation: "Event-Teilnahme",
  shop_order: "Fanshop-Einkauf",
  shop_order_revoked: "Fanshop-Bestellung storniert",
};

export function pointsReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}
