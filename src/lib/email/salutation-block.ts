import { normalizeGender, salutation } from "@/lib/person/gender";

/**
 * Wiederverwendbarer E-Mail-Baustein: geschlechtskorrekte Anrede.
 *
 * In Vorlagen (Admin → E-Mail-Vorlagen) immer so einfügen:
 *   {{salutation}},
 *
 * Beim Versand wird daraus z. B. „Lieber Max,“ / „Liebe Anna,“ / „Liebe/r Fan,“.
 * Der Renderer füllt `salutation` automatisch, wenn `first_name` (+ optional `gender`)
 * übergeben werden — auch bei neuen Vorlagen.
 */
export const EMAIL_SALUTATION_TOKEN = "salutation" as const;

/** Fertiger Snippet zum Einfügen in Betreff/Text/HTML. */
export const EMAIL_SALUTATION_SNIPPET = "{{salutation}}," as const;

export const EMAIL_SALUTATION_PLACEHOLDER = {
  key: EMAIL_SALUTATION_TOKEN,
  label: "Anrede nach Geschlecht (Lieber/Liebe/Liebe/r + Vorname)",
} as const;

/** Geschlechtskorrekte Anrede ohne Komma: „Lieber Max“. */
export function buildEmailSalutation(
  firstName: string,
  genderRaw?: string | null,
): string {
  return salutation(firstName, normalizeGender(genderRaw));
}

/** Basis-Variablen für personenbezogene Mails (inkl. Baustein). */
export function emailPersonVars(input: {
  firstName: string;
  gender?: string | null;
}): { first_name: string; salutation: string; gender: string } {
  const first_name = input.firstName.trim() || "Fan";
  const gender = normalizeGender(input.gender);
  return {
    first_name,
    gender,
    salutation: buildEmailSalutation(first_name, gender),
  };
}

/**
 * Stellt sicher, dass `{{salutation}}` gesetzt ist.
 * Nutzt vorhandenes `salutation`, sonst `first_name` + `gender`.
 */
export function ensureEmailSalutationVars(
  vars: Record<string, string>,
): Record<string, string> {
  if (vars.salutation?.trim()) return vars;
  const first = vars.first_name?.trim();
  if (!first) return vars;
  return {
    ...vars,
    salutation: buildEmailSalutation(first, vars.gender),
  };
}

/**
 * Alte Muster `Liebe/r {{first_name}}` (und Lieber/Liebe/Hallo) → Baustein `{{salutation}}`.
 * Damit bleiben bestehende Vorlagen korrekt, auch ohne manuelles Umschreiben.
 */
export function normalizeLegacySalutationPlaceholders(template: string): string {
  return template
    .replace(/Liebe\/r\s*\{\{\s*first_name\s*\}\}/gi, `{{${EMAIL_SALUTATION_TOKEN}}}`)
    .replace(/Lieber\s*\{\{\s*first_name\s*\}\}/gi, `{{${EMAIL_SALUTATION_TOKEN}}}`)
    .replace(/Liebe\s*\{\{\s*first_name\s*\}\}/gi, `{{${EMAIL_SALUTATION_TOKEN}}}`)
    .replace(/Hallo\s*\{\{\s*first_name\s*\}\},?/gi, `{{${EMAIL_SALUTATION_TOKEN}}},`);
}
