/** Zentrale Punktwerte — müssen mit Supabase-Triggern (supabase/041_*.sql) übereinstimmen. */

export const POINT_VALUES = {
  membershipReferralCompleted: 70,
  membershipReferral: 5,
  pollVote: 5,
  giveawayEntry: 2,
  postComment: 3,
  birthdayComment: 2,
  postLike: 1,
  giveawayLike: 1,
  giveawayComment: 1,
  eventParticipation: 1,
  radioVoting: 1,
  profileIntroComplete: 10,
  liveSessionParticipation: 2,
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
  "Anni-Stars gelten für das laufende Kalenderjahr (Mitternacht 1. Januar, Berlin). Am Jahreswechsel startet die Anzeige bei null — das Vorjahr bleibt archiviert, bis die Sonderverlosung ausgelost ist.";

export const POINTS_YEAR_END_NOTE =
  "Die zehn Mitglieder mit den meisten Anni-Stars am 31. Dezember (Mitternacht Berlin) qualifizieren sich automatisch für die Sonderverlosung. Die Punktestände des Jahres werden gespeichert, damit die Auslosung im Januar fair bleibt — auch wenn schon Sterne fürs neue Jahr gesammelt werden. Bei Gleichstand zählen: mehr Aktivitäten im Jahr, dann früherer Beitritt, dann Nachname alphabetisch. Der Vorstand legt die Preise fest und startet die Auslosung — die Gewinner werden per E-Mail benachrichtigt.";
