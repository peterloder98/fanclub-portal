/** Normalisiertes Geschlecht für Anrede (Geburtstag, E-Mails). */

import { inferGenderFromFirstName } from "@/lib/person/infer-gender-from-name";

export type NormalizedGender = "m" | "w" | "d";

export const GENDER_OPTIONS: { value: NormalizedGender; label: string }[] = [
  { value: "w", label: "Weiblich" },
  { value: "m", label: "Männlich" },
  { value: "d", label: "Divers / keine Angabe" },
];

export const GENDER_OPTIONS_BINARY = GENDER_OPTIONS.filter((o) => o.value !== "d");

export function normalizeGender(raw: string | null | undefined): NormalizedGender {
  const g = (raw ?? "").trim().toLowerCase();
  if (["m", "männlich", "male", "mann", "herr", "männer", "man"].includes(g)) return "m";
  if (["w", "f", "weiblich", "female", "frau", "dame", "woman"].includes(g)) return "w";
  if (["d", "divers", "x", "sonstiges", "andere", "keine angabe", "diverse", "other"].includes(g))
    return "d";
  return "d";
}

/**
 * Geschlecht für Anreden: m/w aus dem Profil, sonst bei d/leer sichere
 * Namens-Inferenz (häufige DE-Vornamen), sonst neutral „d“.
 * Verhindert „Liebe/r“ wenn das Profil fälschlich auf d/keine Angabe steht.
 */
export function resolveGenderForSalutation(
  raw: string | null | undefined,
  firstName?: string | null,
): NormalizedGender {
  const g = normalizeGender(raw);
  if (g === "m" || g === "w") return g;
  const inferred = inferGenderFromFirstName(firstName);
  if (inferred === "m" || inferred === "w") return inferred;
  return "d";
}

/** „Lieber Max“ / „Liebe Anna“ / neutral „Liebe/r …“ (divers / unbekannt). */
export function salutation(firstName: string, gender: NormalizedGender): string {
  const name = firstName.trim() || "Fan";
  if (gender === "m") return `Lieber ${name}`;
  if (gender === "w") return `Liebe ${name}`;
  return `Liebe/r ${name}`;
}

/** Anrede aus Profil-Rohwert (+ optionaler Namens-Fallback). */
export function personSalutation(
  firstName: string,
  genderRaw?: string | null,
): string {
  return salutation(firstName, resolveGenderForSalutation(genderRaw, firstName));
}

/** Dativ: „von ihm“ / „von ihr“ */
export function pronounDative(gender: NormalizedGender): string {
  if (gender === "m") return "ihm";
  if (gender === "w") return "ihr";
  return "ihm/ihr";
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
