/** Zentrale Übersicht: wofür es Statuspunkte gibt (UI + Doku). */

export type PointsRule = {
  id: string;
  label: string;
  points: number;
  how: string;
  note?: string;
};

export const POINTS_YEAR_HINT =
  "Statuspunkte zählen für das laufende Kalenderjahr. Dein Rang steht oben rechts in der Leiste.";

export const POINTS_RULES: PointsRule[] = [
  {
    id: "membership_referral_completed",
    label: "Empfehlung: Antrag eingereicht & Mitglied freigegeben",
    points: 100,
    how: "Du lädst jemanden per „Neues Mitglied werben“ ein, die Person reicht den Antrag digital ein und wird vom Vorstand freigeschaltet.",
    note: "Einmal pro erfolgreicher Empfehlung. Zusätzlich +20 Punkte beim Versand der Einladung.",
  },
  {
    id: "membership_referral",
    label: "Mitgliedsantrag per E-Mail empfehlen",
    points: 20,
    how: "Unter „Neues Mitglied werben“ eine Einladung mit Antragslink erfolgreich versenden.",
    note: "Einmal pro Empfänger-E-Mail-Adresse.",
  },
  {
    id: "poll_vote",
    label: "Erste Stimme in einer Umfrage",
    points: 5,
    how: "In einer Umfrage mindestens eine Antwort wählen.",
    note: "Pro Umfrage einmal. Alle Stimmen zurücknehmen: −5 Punkte.",
  },
  {
    id: "giveaway_entry",
    label: "Am Gewinnspiel teilnehmen",
    points: 10,
    how: "Einmalig bei einem Gewinnspiel mitmachen (Eintrag absenden).",
    note: "Quiz-Lösung kann zusätzlich Punkte geben, je nach Gewinnspiel.",
  },
  {
    id: "post_comment",
    label: "Kommentar zu einem Beitrag",
    points: 3,
    how: "Einen Kommentar unter einem Beitrag im Dashboard schreiben.",
    note: "Einmal pro Beitrag.",
  },
  {
    id: "post_like",
    label: "Beitrag liken",
    points: 1,
    how: "Den Daumen bei einem Beitrag setzen.",
    note: "Like zurücknehmen: Punkt wird wieder abgezogen.",
  },
  {
    id: "giveaway_like",
    label: "Gewinnspiel liken",
    points: 1,
    how: "Ein Gewinnspiel mit „Gefällt mir“ markieren.",
    note: "Like zurücknehmen: Punkt wird wieder abgezogen.",
  },
  {
    id: "giveaway_comment",
    label: "Kommentar zu einem Gewinnspiel",
    points: 1,
    how: "Einen Kommentar bei einem Gewinnspiel schreiben.",
    note: "Einmal pro Gewinnspiel.",
  },
];

/** Nach Punkten absteigend sortiert (für Anzeige). */
export function pointsRulesSortedByPoints(): PointsRule[] {
  return [...POINTS_RULES].sort((a, b) => b.points - a.points);
}

export const POINTS_RANKS = [
  { from: 0, label: "Fan" },
  { from: 50, label: "Aktiv-Fan" },
  { from: 120, label: "Bronze-Fan" },
  { from: 250, label: "Silber-Fan" },
  { from: 450, label: "Gold-Fan" },
  { from: 700, label: "Diamond-Fan" },
] as const;
