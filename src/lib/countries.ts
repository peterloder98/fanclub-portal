export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

function flagFromCode(code: string) {
  const c = code.toUpperCase();
  if (c.length !== 2) return "🏳️";
  return String.fromCodePoint(
    ...[...c].map((ch) => 0x1f1e6 - 65 + ch.charCodeAt(0)),
  );
}

const NAMES: Record<string, string> = {
  AT: "Österreich",
  BE: "Belgien",
  CH: "Schweiz",
  CZ: "Tschechien",
  DE: "Deutschland",
  DK: "Dänemark",
  ES: "Spanien",
  FI: "Finnland",
  FR: "Frankreich",
  GB: "Großbritannien",
  GR: "Griechenland",
  HR: "Kroatien",
  HU: "Ungarn",
  IE: "Irland",
  IT: "Italien",
  LI: "Liechtenstein",
  LU: "Luxemburg",
  NL: "Niederlande",
  NO: "Norwegen",
  PL: "Polen",
  PT: "Portugal",
  RO: "Rumänien",
  SE: "Schweden",
  SI: "Slowenien",
  SK: "Slowakei",
  US: "USA",
};

const ISO_CODES = [
  "AD",
  "AE",
  "AF",
  "AL",
  "AM",
  "AR",
  "AT",
  "AU",
  "AZ",
  "BA",
  "BD",
  "BE",
  "BG",
  "BR",
  "BY",
  "CA",
  "CH",
  "CL",
  "CN",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EG",
  "ES",
  "FI",
  "FR",
  "GB",
  "GE",
  "GR",
  "HK",
  "HR",
  "HU",
  "ID",
  "IE",
  "IL",
  "IN",
  "IR",
  "IS",
  "IT",
  "JP",
  "KR",
  "LI",
  "LT",
  "LU",
  "LV",
  "MA",
  "MC",
  "MD",
  "ME",
  "MK",
  "MT",
  "MX",
  "MY",
  "NG",
  "NL",
  "NO",
  "NZ",
  "PH",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SA",
  "SE",
  "SG",
  "SI",
  "SK",
  "TH",
  "TR",
  "TW",
  "UA",
  "US",
  "VN",
  "ZA",
];

function defaultName(code: string) {
  try {
    const dn = new Intl.DisplayNames(["de"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

export const COUNTRIES: CountryOption[] = ISO_CODES.map((code) => ({
  code,
  name: NAMES[code] ?? defaultName(code),
  flag: flagFromCode(code),
})).sort((a, b) => a.name.localeCompare(b.name, "de"));

export const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.code === "DE")!;

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function countryByName(name: string) {
  const n = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === n);
}
