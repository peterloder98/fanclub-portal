import { normalizeGender, salutation, type NormalizedGender } from "@/lib/person/gender";

export function birthdayTemplateIndex(userId: string, dateIso: string): number {
  let h = 0;
  const s = `${userId}:${dateIso}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 5;
}

const TEMPLATES: Array<(s: string, g: NormalizedGender) => { title: string; body: string }> = [
  (s, g) => ({
    title: `Alles Gute, ${s.trim() || "Fan"}! 🎂`,
    body: `${salutation(s, g)}, wir wünschen dir heute alles Gute zu deinem Geburtstag — dein Anni Perka Fanclub.`,
  }),
  (s, g) => ({
    title: `Happy Birthday! 🎉`,
    body: `${salutation(s, g)}, der Fanclub feiert dich heute: alles Liebe zum Geburtstag und einen wundervollen Tag!`,
  }),
  (s, g) => ({
    title: `Geburtstagsgrüße`,
    body: `${salutation(s, g)}, von uns aus dem Anni Perka Fanclub: herzlichen Glückwunsch und viel Freude an deinem besonderen Tag!`,
  }),
  (s, g) => ({
    title: `Heute ist dein Tag!`,
    body: `${salutation(s, g)}, wir denken heute besonders an dich — alles Gute, Gesundheit und schöne Momente wünscht dir dein Fanclub-Team.`,
  }),
  (s, g) => ({
    title: `Zum Geburtstag`,
    body: `${salutation(s, g)}, danke, dass du Teil der Community bist. Heute wünschen wir dir von Herzen einen tollen Geburtstag! — Anni Perka Fanclub`,
  }),
];

export function listBirthdayTemplatePreviews(
  firstName = "Max",
  genderRaw: string | null | undefined = "m",
) {
  const g = normalizeGender(genderRaw);
  return TEMPLATES.map((fn, index) => {
    const { title, body } = fn(firstName, g);
    return { index: index + 1, title, body };
  });
}

export function birthdayPostBody(
  firstName: string,
  genderRaw: string | null | undefined,
  userId: string,
  dateIso: string,
): { title: string; body: string } {
  const g = normalizeGender(genderRaw);
  const idx = birthdayTemplateIndex(userId, dateIso);
  return TEMPLATES[idx]!(firstName, g);
}
