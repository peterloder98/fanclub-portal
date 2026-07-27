/** Öffentliche Intro-Fragen für das Mitglieder-Portal (alle optional). */

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

export type MemberIntroAnswers = Partial<Record<MemberIntroKey, string | null>>;

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
