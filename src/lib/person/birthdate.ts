export type BirthdateSegments = { day: string; month: string; year: string };

export function digitsOnly(raw: string, max: number) {
  return raw.replace(/\D/g, "").slice(0, max);
}

/** Zweistelliges Jahr erweitern: 00–30 → 2000–2030, 31–99 → 1931–1999. */
export function expandYearToFourDigits(year: string): string {
  const y = digitsOnly(year, 4);
  if (y.length === 4) return y;
  if (y.length !== 2) return y;
  const n = Number(y);
  return n <= 30 ? `20${y}` : `19${y}`;
}

export function segmentsToIso(day: string, month: string, year: string) {
  const y4 = expandYearToFourDigits(year);
  if (day.length === 2 && month.length === 2 && y4.length === 4) {
    return `${y4}-${month}-${day}`;
  }
  return "";
}

export function clampDayInput(raw: string) {
  const d = digitsOnly(raw, 2);
  if (d.length < 2) return d;
  const n = Number(d);
  if (n < 1) return "01";
  if (n > 31) return "31";
  return d;
}

export function clampMonthInput(raw: string) {
  const m = digitsOnly(raw, 2);
  if (m.length < 2) return m;
  const n = Number(m);
  if (n < 1) return "01";
  if (n > 12) return "12";
  return m;
}

export function filterYearInput(raw: string) {
  const y = digitsOnly(raw, 4);
  if (!y) return "";
  // Volles Jahr: nur 19xx / 20xx
  if (y.length >= 3) {
    if (y[0] !== "1" && y[0] !== "2") return "";
    const prefix = y.slice(0, 2);
    if (prefix !== "19" && prefix !== "20") return y.slice(0, 1);
  }
  return y;
}

export function isValidIsoDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function validateBirthdateSegments(segments: BirthdateSegments): string | null {
  const { day, month, year } = segments;

  if (day.length === 2) {
    const d = Number(day);
    if (d < 1 || d > 31) return "Tag muss zwischen 01 und 31 liegen.";
  }
  if (month.length === 2) {
    const mo = Number(month);
    if (mo < 1 || mo > 12) return "Monat muss zwischen 01 und 12 liegen.";
  }
  if (year.length === 4) {
    const prefix = year.slice(0, 2);
    if (prefix !== "19" && prefix !== "20") {
      return "Jahr muss mit 19 oder 20 beginnen — bitte korrigieren.";
    }
  }
  if (day.length === 2 && month.length === 2 && (year.length === 2 || year.length === 4)) {
    const iso = segmentsToIso(day, month, year);
    if (!isValidIsoDate(iso)) return "Bitte ein gültiges Geburtsdatum eingeben.";
    return null;
  }
  if (day || month || year) {
    return "Bitte Geburtsdatum vollständig eingeben (TT.MM.JJJJ oder TT.MM.JJ).";
  }
  return null;
}

/** Normalisiert Profil- oder Eingabe-Datum auf YYYY-MM-DD. */
export function normalizeBirthdateIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const de = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(raw);
  if (de) {
    const day = de[1].padStart(2, "0");
    const month = de[2].padStart(2, "0");
    const year = expandYearToFourDigits(de[3]);
    const iso = `${year}-${month}-${day}`;
    return isValidIsoDate(iso) ? iso : null;
  }
  return null;
}
