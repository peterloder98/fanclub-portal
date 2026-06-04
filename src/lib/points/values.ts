/** Zentrale Punktwerte — müssen mit Supabase-Triggern (supabase/041_*.sql) übereinstimmen. */

export const POINT_VALUES = {
  membershipReferralCompleted: 100,
  membershipReferral: 20,
  pollVote: 5,
  giveawayEntry: 2,
  postComment: 3,
  postLike: 1,
  giveawayLike: 1,
  giveawayComment: 1,
  eventParticipation: 1,
} as const;

export const POINTS_RANKS = [
  { from: 0, label: "Fan" },
  { from: 25, label: "Aktiv-Fan" },
  { from: 75, label: "Bronze-Fan" },
  { from: 150, label: "Silber-Fan" },
  { from: 250, label: "Gold-Fan" },
  { from: 400, label: "Diamond-Fan" },
] as const;

export const POINTS_YEAR_HINT =
  "Statuspunkte gelten für das laufende Kalenderjahr. Am 1. Januar startet die Zählung neu — dein Rang in der Leiste zeigt deinen Einsatz im Club.";

export const POINTS_YEAR_END_NOTE =
  "Aktuell sind Statuspunkte eine Anerkennung für Engagement (Rang in der App), ohne automatische Einlösung am Jahresende. Soll es später Club-Vorteile geben (z. B. Verlosung, Merch, Meet & Greet), legt das der Vorstand separat fest und wir ergänzen die App.";
