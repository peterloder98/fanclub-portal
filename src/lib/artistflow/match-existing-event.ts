import type { NormalizedExternalEvent } from "@/lib/artistflow/normalize";
import {
  eventCalendarDay,
  legacyExternalId,
  normalizeEventTitle,
} from "@/lib/artistflow/legacy-external-id";

export type ExistingExternalEventRow = {
  id: string;
  external_id: string;
  title: string;
  start_at: string | null;
  city: string | null;
  content_hash: string;
  is_visible: boolean;
  participation_count?: number;
  has_travel_note?: boolean;
};

function scoreMatch(row: ExistingExternalEventRow) {
  let score = 0;
  if (row.is_visible) score += 4;
  if ((row.participation_count ?? 0) > 0) score += 10 + (row.participation_count ?? 0);
  if (row.has_travel_note) score += 8;
  return score;
}

function pickBest(candidates: ExistingExternalEventRow[]) {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => scoreMatch(b) - scoreMatch(a))[0] ?? null;
}

/**
 * Findet bestehendes Portal-Event zum Feed-Eintrag.
 * Reihenfolge: event_id → Legacy-Hash → Titel+Datum
 */
export function matchExistingExternalEvent(
  feed: NormalizedExternalEvent,
  rows: ExistingExternalEventRow[],
): ExistingExternalEventRow | null {
  const byExternalId = new Map(rows.map((r) => [r.external_id, r]));

  if (byExternalId.has(feed.external_id)) {
    return byExternalId.get(feed.external_id)!;
  }

  const legacyCandidates = [
    legacyExternalId({
      dateSort: feed.start_at,
      title: feed.title,
      city: feed.city,
      venue: feed.venue,
    }),
    legacyExternalId({
      dateSort: eventCalendarDay(feed.start_at),
      title: feed.title,
      city: feed.city,
      venue: feed.venue,
    }),
  ];
  for (const legacyId of legacyCandidates) {
    if (byExternalId.has(legacyId)) {
      return byExternalId.get(legacyId)!;
    }
  }

  const feedTitle = normalizeEventTitle(feed.title);
  const feedDay = eventCalendarDay(feed.start_at);
  if (!feedTitle || !feedDay) return null;

  const titleDayMatches = rows.filter(
    (r) =>
      normalizeEventTitle(r.title) === feedTitle &&
      eventCalendarDay(r.start_at) === feedDay,
  );
  return pickBest(titleDayMatches);
}
