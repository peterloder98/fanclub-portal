/** Öffentliche Intro-Fragen für das Mitglieder-Portal (alle optional). */

export const SHORT_BIO_MAX_LENGTH = 150;

/**
 * Max. Länge einer Kennenlernen-Antwort ≈ 3 Zeilen Desktop (text-sm).
 * Bestehende längere Texte bleiben lesbar („mehr anzeigen“), neue Eingaben werden begrenzt.
 */
export const INTRO_ANSWER_MAX_LENGTH = 240;

/** Beim Ausfüllen (Willkommen / Profil): Anrede „dich“ bzw. „mich“. */
export const SHORT_BIO_LABEL_YOU = "Ein paar Worte über dich";
export const SHORT_BIO_LABEL_ME = "Ein paar Worte über mich";

export const MEMBER_INTRO_QUESTIONS = [
  {
    key: "intro_discovered_anni",
    label: "Wie bist du auf Anni aufmerksam geworden?",
  },
  {
    key: "intro_favorite_song",
    label: "Welcher Song von Anni ist dein Lieblingslied?",
  },
  {
    key: "intro_other_artists",
    label: "Welche Schlagerkünstler magst du besonders (ausser Anni!)?",
  },
  {
    key: "intro_hobbies",
    label: "Was hast du für Hobbies?",
  },
  {
    key: "intro_perfect_concert",
    label: "Wie sieht das perfekte Konzert für dich aus?",
  },
] as const;

export type MemberIntroKey = (typeof MEMBER_INTRO_QUESTIONS)[number]["key"];

export type MemberIntroAnswers = Partial<Record<MemberIntroKey, string | null>> & {
  short_bio?: string | null;
};

export function memberPortalPath(userId: string) {
  return `/mitglieder/${userId}`;
}

export function formatMemberOrigin(input: {
  city?: string | null;
  country?: string | null;
  countryLabel?: string | null;
}): string | null {
  const city = (input.city ?? "").trim();
  const country = (input.countryLabel ?? input.country ?? "").trim();
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return null;
}

export function normalizeShortBio(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.slice(0, SHORT_BIO_MAX_LENGTH);
}

export function normalizeIntroAnswer(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\r\n/g, "\n");
  if (!t) return null;
  return t.slice(0, INTRO_ANSWER_MAX_LENGTH);
}
