import {
  eventCalendarDay,
  normalizeEventTitle,
} from "@/lib/artistflow/legacy-external-id";

export function normalizeEventPlace(parts: {
  kind?: string | null;
  city?: string | null;
  broadcaster?: string | null;
}) {
  const kind = (parts.kind ?? "event").trim().toLowerCase();
  if (kind === "tv") {
    return (parts.broadcaster ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  }
  return (parts.city ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Eindeutiger Schlüssel pro Feed-Event (Titel + Berlin-Tag + Ort/Sender + Art). */
export function feedMatchKey(parts: {
  kind?: string | null;
  title: string | null | undefined;
  start_at: string | null | undefined;
  city?: string | null;
  broadcaster?: string | null;
}) {
  const kind = (parts.kind ?? "event").trim().toLowerCase();
  const title = normalizeEventTitle(parts.title);
  const day = eventCalendarDay(parts.start_at);
  const place = normalizeEventPlace(parts);
  return `${kind}|${title}|${day}|${place}`;
}
