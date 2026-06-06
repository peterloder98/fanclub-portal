/** Normalisiertes Geschlecht für Anrede (Geburtstag, E-Mails). */

export type NormalizedGender = "m" | "w" | "d";

export const GENDER_OPTIONS: { value: NormalizedGender; label: string }[] = [
  { value: "w", label: "Weiblich" },
  { value: "m", label: "Männlich" },
  { value: "d", label: "Divers / keine Angabe" },
];

export function normalizeGender(raw: string | null | undefined): NormalizedGender {
  const g = (raw ?? "").trim().toLowerCase();
  if (["m", "männlich", "male", "mann", "herr", "männer"].includes(g)) return "m";
  if (["w", "weiblich", "female", "frau", "dame"].includes(g)) return "w";
  if (["d", "divers", "x", "sonstiges", "andere", "keine angabe"].includes(g)) return "d";
  return "d";
}

/** „Lieber Max“ / „Liebe Anna“ / neutral „Liebe/r …“ */
export function salutation(firstName: string, gender: NormalizedGender): string {
  const name = firstName.trim() || "Fan";
  if (gender === "m") return `Lieber ${name}`;
  if (gender === "w") return `Liebe ${name}`;
  return `Liebe/r ${name}`;
}

export function isValidGenderInput(raw: string): boolean {
  return ["m", "w", "d", "männlich", "weiblich", "divers"].includes(raw.trim().toLowerCase()) ||
    GENDER_OPTIONS.some((o) => o.value === raw.trim().toLowerCase());
}

/** Anzeige in Admin & Mitgliedsdaten (nicht m/w/d). */
export function genderDisplayLabel(raw: string | null | undefined): string {
  const g = normalizeGender(raw);
  return GENDER_OPTIONS.find((o) => o.value === g)?.label ?? "—";
}
