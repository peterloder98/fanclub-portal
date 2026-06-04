/** Zentrale Übersicht: wofür es Statuspunkte gibt (UI + Doku). */

import {
  POINTS_RANKS,
  POINTS_YEAR_END_NOTE,
  POINTS_YEAR_HINT,
  POINT_VALUES,
} from "@/lib/points/values";

export type PointsRule = {
  id: string;
  label: string;
  points: number;
  how: string;
  note?: string;
};

export { POINTS_RANKS, POINTS_YEAR_END_NOTE, POINTS_YEAR_HINT, POINT_VALUES };

export const POINTS_RULES: PointsRule[] = [
  {
    id: "membership_referral_completed",
    label: "Empfehlung: Antrag eingereicht & Mitglied freigegeben",
    points: POINT_VALUES.membershipReferralCompleted,
    how: "Du lädst jemanden per „Neues Mitglied werben“ ein, die Person reicht den Antrag digital ein und wird vom Vorstand freigeschaltet.",
    note: "Einmal pro erfolgreicher Empfehlung. Zusätzlich +20 Punkte beim Versand der Einladung.",
  },
  {
    id: "membership_referral",
    label: "Mitgliedsantrag per E-Mail empfehlen",
    points: POINT_VALUES.membershipReferral,
    how: "Unter „Neues Mitglied werben“ eine Einladung mit Antragslink erfolgreich versenden.",
    note: "Einmal pro Empfänger-E-Mail-Adresse.",
  },
  {
    id: "poll_vote",
    label: "An Umfrage teilgenommen",
    points: POINT_VALUES.pollVote,
    how: "In einer Umfrage mindestens eine Antwort wählen.",
    note: `Pro Umfrage einmal. Alle Stimmen zurücknehmen: −${POINT_VALUES.pollVote} Punkte.`,
  },
  {
    id: "birthday_comment",
    label: "Zum Geburtstag gratuliert",
    points: POINT_VALUES.birthdayComment,
    how: "Einmal einen Kommentar unter einem Geburtstags-Beitrag im Feed schreiben.",
    note: "Einmal pro Geburtstags-Beitrag. Kommentar löschen: −2 Punkte.",
  },
  {
    id: "post_comment",
    label: "Beitrag kommentiert",
    points: POINT_VALUES.postComment,
    how: "Einen Kommentar unter einem normalen Beitrag im Dashboard schreiben.",
    note: "Einmal pro Beitrag — weitere Kommentare bringen keine zusätzlichen Punkte. Löschen: −3 Punkte.",
  },
  {
    id: "giveaway_entry",
    label: "An Gewinnspiel teilgenommen",
    points: POINT_VALUES.giveawayEntry,
    how: "Einmalig bei einem Gewinnspiel mitmachen (Eintrag absenden).",
    note: "Geringer Bonus — der mögliche Gewinn ist der Hauptanreiz.",
  },
  {
    id: "event_participation",
    label: "Am Event teilnehmen",
    points: POINT_VALUES.eventParticipation,
    how: "Bei einem Termin in der Event-Liste „Am Event teilnehmen“ wählen.",
    note: "Pro Event einmal. Teilnahme zurücknehmen: −1 Punkt.",
  },
  {
    id: "post_like",
    label: "Beitrag geliked",
    points: POINT_VALUES.postLike,
    how: "Den Daumen bei einem Beitrag setzen.",
    note: "Like zurücknehmen: Punkt wird wieder abgezogen.",
  },
  {
    id: "giveaway_like",
    label: "Gewinnspiel geliked",
    points: POINT_VALUES.giveawayLike,
    how: "Ein Gewinnspiel mit „Gefällt mir“ markieren.",
    note: "Like zurücknehmen: Punkt wird wieder abgezogen.",
  },
  {
    id: "giveaway_comment",
    label: "Kommentar zu einem Gewinnspiel",
    points: POINT_VALUES.giveawayComment,
    how: "Einen Kommentar bei einem Gewinnspiel schreiben.",
    note: "Einmal pro Gewinnspiel.",
  },
];

export function pointsRulesSortedByPoints(): PointsRule[] {
  return [...POINTS_RULES].sort((a, b) => b.points - a.points);
}
