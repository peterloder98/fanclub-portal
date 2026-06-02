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
}): string | null {
  const pc = (parts.postal_code ?? "").trim();
  const city = (parts.city ?? "").trim();
  const address = (parts.address ?? "").trim();

  const cityLine = [pc, city].filter(Boolean).join(" ");
  if (address && cityLine) return `${address}, ${cityLine}`;
  if (address) return address;
  if (cityLine) return cityLine;
  if (city) return city;
  return null;
}

export function formatLocation(parts: {
  venue?: string | null;
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
}): string | null {
  const addr = formatEventAddress({
    address: parts.address,
    postal_code: parts.postal_code,
    city: parts.city,
  });
  const venue = (parts.venue ?? "").trim();
  if (venue && addr) return `${venue}, ${addr}`;
  if (venue) return venue;
  return addr;
}
