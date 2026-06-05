import { computeHash } from "@/lib/artistflow/normalize";

/** Fallback-ID vor Einführung von kind/broadcaster im Hash. */
export function legacyFallbackIdBasis(parts: {
  dateSort?: string | null;
  title?: string | null;
  city?: string | null;
  venue?: string | null;
}) {
  const dateSort = (parts.dateSort ?? "").trim();
  const title = (parts.title ?? "").trim();
  const city = (parts.city ?? "").trim();
  const venue = (parts.venue ?? "").trim();
  return `${dateSort}|${title}|${city}|${venue}`;
}

export function legacyExternalId(parts: {
  dateSort?: string | null;
  title?: string | null;
  city?: string | null;
  venue?: string | null;
}) {
  return computeHash(legacyFallbackIdBasis(parts));
}

export function normalizeEventTitle(title: string | null | undefined) {
  return (title ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

export function eventCalendarDay(startAt: string | null | undefined) {
  if (!startAt) return "";
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return startAt.trim().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function eventStartChanged(
  prev: string | null | undefined,
  next: string | null | undefined,
): boolean {
  const a = (prev ?? "").trim();
  const b = (next ?? "").trim();
  if (a === b) return false;
  if (!a || !b) return true;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return a !== b;
  return da.getTime() !== db.getTime();
}
