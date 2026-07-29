/** Zentrale Punktwerte — müssen mit Supabase-Triggern (supabase/041_*.sql) übereinstimmen. */

export const POINT_VALUES = {
  membershipReferralCompleted: 70,
  membershipReferral: 20,
  pollVote: 5,
  giveawayEntry: 2,
  postComment: 3,
  birthdayComment: 2,
  postLike: 1,
  giveawayLike: 1,
  giveawayComment: 1,
  eventParticipation: 1,
  radioVoting: 1,
} as const;

export const POINTS_RANKS = [
  { from: 0, label: "Fan" },
  { from: 100, label: "Aktiv-Fan" },
  { from: 250, label: "Treue-Fan" },
  { from: 500, label: "Silber-Fan" },
  { from: 1000, label: "Gold-Fan" },
  { from: 2500, label: "Diamond-Fan" },
] as const;

export const POINTS_YEAR_HINT =
  "Anni-Stars gelten für das laufende Kalenderjahr. Am 1. Januar startet die Zählung neu — dein Rang in der Leiste zeigt deinen Einsatz im Club.";

export const POINTS_YEAR_END_NOTE =
  "Die zehn Mitglieder mit den meisten Anni-Stars am Jahresende qualifizieren sich automatisch für die Sonderverlosung. Bei Gleichstand zählen: mehr Aktivitäten im Jahr, dann früherer Beitritt, dann Nachname alphabetisch. Der Vorstand legt die Preise fest und startet die Auslosung — die Gewinner werden per E-Mail benachrichtigt. Am 1. Januar starten alle Anni-Stars wieder bei null.";
