/** Postal codes by country (membership / profiles). */

export function sanitizePostalCode(raw: string, countryCode?: string | null) {
  const c = (countryCode ?? "DE").trim().toUpperCase() || "DE";
  if (c === "NL") {
    const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
    const digits = cleaned.replace(/\D/g, "").slice(0, 4);
    const letters = cleaned.replace(/[^A-Z]/g, "").slice(0, 2);
    if (!digits) return "";
    if (!letters) return digits;
    return `${digits} ${letters}`;
  }
  if (c === "CH" || c === "AT") {
    return raw.replace(/\D/g, "").slice(0, 4);
  }
  // DE and most others: digits only, max 5 (DE) or 10
  const max = c === "DE" ? 5 : 10;
  return raw.replace(/\D/g, "").slice(0, max);
}

export function isValidPostalCode(value: string, countryCode?: string | null) {
  const v = value.trim();
  const c = (countryCode ?? "DE").trim().toUpperCase() || "DE";
  if (c === "DE") return /^\d{5}$/.test(v);
  if (c === "CH" || c === "AT") return /^\d{4}$/.test(v);
  if (c === "NL") return /^\d{4}(?:\s?[A-Z]{2})?$/i.test(v);
  return v.length >= 3 && v.length <= 12;
}

export function postalCodeHint(countryCode?: string | null) {
  const c = (countryCode ?? "DE").trim().toUpperCase() || "DE";
  if (c === "CH" || c === "AT") return "4 Ziffern.";
  if (c === "NL") return "4 Ziffern, optional 2 Buchstaben (z. B. 7608 AB).";
  if (c === "DE") return "5 Ziffern, keine Buchstaben.";
  return "PLZ wie in deinem Land üblich.";
}

export function postalCodeErrorMessage(countryCode?: string | null) {
  const c = (countryCode ?? "DE").trim().toUpperCase() || "DE";
  if (c === "CH" || c === "AT") return "PLZ muss genau 4 Ziffern haben.";
  if (c === "NL") return "Bitte eine gültige niederländische PLZ angeben (z. B. 7608 oder 7608 AB).";
  if (c === "DE") return "PLZ muss genau 5 Ziffern haben.";
  return "Bitte eine gültige PLZ angeben.";
}
