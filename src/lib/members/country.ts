/** ISO-ähnliche Ländercodes für Mitgliederadressen. */

const COUNTRY_ALIASES: Record<string, string> = {
  DE: "DE",
  DEU: "DE",
  DEUTSCHLAND: "DE",
  GERMANY: "DE",
  D: "DE",
  CH: "CH",
  CHE: "CH",
  SCHWEIZ: "CH",
  SWITZERLAND: "CH",
  SUISSE: "CH",
  NL: "NL",
  NLD: "NL",
  NIEDERLANDE: "NL",
  NIEDERANDE: "NL", // Tippfehler in Mitgliederliste
  HOLLAND: "NL",
  NETHERLANDS: "NL",
  AT: "AT",
  AUT: "AT",
  OESTERREICH: "AT",
  ÖSTERREICH: "AT",
  AUSTRIA: "AT",
};

export const MEMBER_COUNTRY_OPTIONS = [
  { value: "DE", label: "Deutschland" },
  { value: "CH", label: "Schweiz" },
  { value: "NL", label: "Niederlande" },
  { value: "AT", label: "Österreich" },
] as const;

function aliasKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function normalizeMemberCountryCode(
  country: string | null | undefined,
  fallback = "DE",
): string {
  const raw = (country ?? "").trim();
  if (!raw) return fallback;
  return COUNTRY_ALIASES[aliasKey(raw)] ?? (raw.length <= 3 ? raw.toUpperCase() : fallback);
}

export function memberCountryLabel(code: string | null | undefined): string {
  const c = normalizeMemberCountryCode(code);
  return MEMBER_COUNTRY_OPTIONS.find((o) => o.value === c)?.label ?? c;
}

function countryFromOrtSuffix(suffix: string): string | null {
  const key = aliasKey(suffix);
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  const upper = suffix.trim().toUpperCase();
  if (/SCHWEIZ|SUISSE|SWITZERLAND/.test(upper)) return "CH";
  if (/NIEDER|HOLLAND|NETHERLANDS/.test(upper)) return "NL";
  if (/ÖSTERREICH|OESTERREICH|AUSTRIA/.test(upper)) return "AT";
  if (/DEUTSCHLAND|GERMANY/.test(upper)) return "DE";
  return null;
}

/**
 * Excel/Ort oft: "Altdorf - Schweiz" oder "Almelo - Niederande".
 * Liefert bereinigten Ort + Ländercode.
 */
export function parseCityAndCountryFromOrt(
  ort: string | null | undefined,
  fallbackCountry = "DE",
): { city: string | null; country: string } {
  const raw = (ort ?? "").trim();
  if (!raw) return { city: null, country: fallbackCountry };

  const split = raw.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (split) {
    const city = split[1].trim();
    const fromSuffix = countryFromOrtSuffix(split[2]);
    if (fromSuffix) return { city: city || null, country: fromSuffix };
  }

  return { city: raw, country: fallbackCountry };
}
