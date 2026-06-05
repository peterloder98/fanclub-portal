import { normalizeGender, salutation, type NormalizedGender } from "@/lib/person/gender";
import type { BirthdayGreetingTemplate } from "@/lib/birthday/template-store";
import { loadActiveBirthdayTemplates } from "@/lib/birthday/template-store";

export type BirthdayTemplateShape = {
  title_template: string;
  body_template: string;
};

export const DEFAULT_BIRTHDAY_TEMPLATES: BirthdayTemplateShape[] = [
  {
    title_template: "Alles Gute, {{first_name}}! 🎂",
    body_template:
      "{{salutation}}, wir wünschen dir heute alles Gute zu deinem Geburtstag — dein Anni Perka Fanclub.",
  },
  {
    title_template: "Happy Birthday! 🎉",
    body_template:
      "{{salutation}}, der Fanclub feiert dich heute: alles Liebe zum Geburtstag und einen wundervollen Tag!",
  },
  {
    title_template: "Geburtstagsgrüße",
    body_template:
      "{{salutation}}, von uns aus dem Anni Perka Fanclub: herzlichen Glückwunsch und viel Freude an deinem besonderen Tag!",
  },
  {
    title_template: "Heute ist dein Tag!",
    body_template:
      "{{salutation}}, wir denken heute besonders an dich — alles Gute, Gesundheit und schöne Momente wünscht dir dein Fanclub-Team.",
  },
  {
    title_template: "Zum Geburtstag",
    body_template:
      "{{salutation}}, danke, dass du Teil der Community bist. Heute wünschen wir dir von Herzen einen tollen Geburtstag! — Anni Perka Fanclub",
  },
];

export function birthdayTemplateIndex(userId: string, dateIso: string, count: number): number {
  let h = 0;
  const s = `${userId}:${dateIso}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  const n = Math.max(1, count);
  return Math.abs(h) % n;
}

export function renderBirthdayTemplateText(
  template: string,
  firstName: string,
  genderRaw: string | null | undefined,
) {
  const g = normalizeGender(genderRaw);
  const name = firstName.trim() || "Fan";
  return template
    .replace(/\{\{first_name\}\}/g, name)
    .replace(/\{\{salutation\}\}/g, salutation(name, g));
}

export function birthdayPostBodyFromList(
  firstName: string,
  genderRaw: string | null | undefined,
  userId: string,
  dateIso: string,
  templates: BirthdayTemplateShape[],
): { title: string; body: string } {
  const list = templates.length ? templates : DEFAULT_BIRTHDAY_TEMPLATES;
  const idx = birthdayTemplateIndex(userId, dateIso, list.length);
  const t = list[idx]!;
  return {
    title: renderBirthdayTemplateText(t.title_template, firstName, genderRaw),
    body: renderBirthdayTemplateText(t.body_template, firstName, genderRaw),
  };
}

/** Sync — nutzt Standard-Vorlagen (Tests & Fallback). */
export function birthdayPostBody(
  firstName: string,
  genderRaw: string | null | undefined,
  userId: string,
  dateIso: string,
): { title: string; body: string } {
  return birthdayPostBodyFromList(firstName, genderRaw, userId, dateIso, DEFAULT_BIRTHDAY_TEMPLATES);
}

export async function birthdayPostBodyAsync(
  firstName: string,
  genderRaw: string | null | undefined,
  userId: string,
  dateIso: string,
): Promise<{ title: string; body: string }> {
  const rows = await loadActiveBirthdayTemplates();
  const templates = rows.map((r) => ({
    title_template: r.title_template,
    body_template: r.body_template,
  }));
  return birthdayPostBodyFromList(firstName, genderRaw, userId, dateIso, templates);
}

export function listBirthdayTemplatePreviews(
  firstName = "Max",
  genderRaw: string | null | undefined = "m",
  templates: BirthdayTemplateShape[] = DEFAULT_BIRTHDAY_TEMPLATES,
) {
  return templates.map((t, index) => ({
    index: index + 1,
    title: renderBirthdayTemplateText(t.title_template, firstName, genderRaw),
    body: renderBirthdayTemplateText(t.body_template, firstName, genderRaw),
    title_template: t.title_template,
    body_template: t.body_template,
  }));
}

export function dbRowToTemplateShape(row: BirthdayGreetingTemplate): BirthdayTemplateShape {
  return {
    title_template: row.title_template,
    body_template: row.body_template,
  };
}
