const dateFmt = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Midnight in ISO/DB strings = date-only placeholder from Artistflow (no real start time). */
function isMidnightPlaceholderTime(s: string): boolean {
  const iso = s.match(/T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/i);
  if (iso) {
    const ss = iso[3] ?? "00";
    return iso[1] === "00" && iso[2] === "00" && (ss === "00" || ss === "0");
  }
  const spaced = s.match(/\s(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (spaced) {
    const ss = spaced[3] ?? "00";
    return spaced[1] === "00" && spaced[2] === "00" && (ss === "00" || ss === "0");
  }
  return false;
}

/** True when start_at includes a real clock time (not date-only / midnight placeholder). */
export function hasEventStartTime(startAt: string | null): boolean {
  if (!startAt) return false;
  const s = startAt.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (isMidnightPlaceholderTime(s)) return false;
  if (!/T|\d{2}:\d{2}/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export function formatEventStart(startAt: string | null) {
  if (!startAt) return { date: "Datum folgt", time: null as string | null };
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return { date: "Datum folgt", time: null };
  return {
    date: dateFmt.format(d),
    time: hasEventStartTime(startAt) ? timeFmt.format(d) : null,
  };
}

export function formatEventAddress(parts: {
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): string | null {
  const pc = (parts.postal_code ?? "").trim();
  const city = (parts.city ?? "").trim();
  const address = (parts.address ?? "").trim();
  const country = normalizeCountryCode(parts.country);
  const abroad = country !== "DE" ? ` (${country})` : "";

  const cityPart = [pc, city].filter(Boolean).join(" ");
  const cityLine = cityPart ? `${cityPart}${abroad}` : "";

  if (address && cityLine) return `${address}, ${cityLine}`;
  if (address) return address;
  if (cityLine) return cityLine;
  return null;
}

function normalizeCountryCode(country?: string | null): string {
  const c = (country ?? "").trim().toUpperCase();
  return c || "DE";
}

/** Ort in der Terminliste: nur Stadt, bei Ausland optional „ (CH)“. */
export function formatEventCity(parts: {
  city?: string | null;
  country?: string | null;
}): string | null {
  const city = (parts.city ?? "").trim();
  if (!city) return null;
  const country = normalizeCountryCode(parts.country);
  if (country !== "DE") return `${city} (${country})`;
  return city;
}

/** Location-Name (Stadthalle, Park …) — separat von der Stadt. */
export function formatVenueName(venue?: string | null): string | null {
  const v = (venue ?? "").trim();
  return v || null;
}

/** TV-Auftritt: Sender-Zeile in der Terminliste. */
export function formatTvBroadcaster(broadcaster?: string | null): string | null {
  const b = (broadcaster ?? "").trim();
  return b || null;
}

/**
 * Ort-Zeile in Listen (Events: Stadt; TV: Sender).
 * Entspricht Artistflow: city allein, nicht venue/postal_code kombinieren.
 */
export function formatLocation(parts: {
  kind?: string | null;
  city?: string | null;
  country?: string | null;
  broadcaster?: string | null;
  venue?: string | null;
  address?: string | null;
  postal_code?: string | null;
}): string | null {
  if (parts.kind === "tv") {
    const sender = formatTvBroadcaster(parts.broadcaster);
    return sender ? `TV · ${sender}` : "TV";
  }
  return formatEventCity({ city: parts.city, country: parts.country });
}

/** Kalender-Export: Venue + vollständige Adresse (nicht nur Stadt). */
export function formatCalendarLocation(parts: {
  venue?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): string | null {
  const addr = formatEventAddress({
    address: parts.address,
    postal_code: parts.postal_code,
    city: parts.city,
    country: parts.country,
  });
  const venue = formatVenueName(parts.venue);
  if (venue && addr) return `${venue}, ${addr}`;
  if (venue) return venue;
  return addr;
}
