import { describe, expect, it } from "vitest";
import { normalizeArtistflowEvent } from "./normalize";
import { matchExistingExternalEvent, type ExistingExternalEventRow } from "./match-existing-event";
import { legacyExternalId } from "./legacy-external-id";

describe("matchExistingExternalEvent", () => {
  const rows: ExistingExternalEventRow[] = [
    {
      id: "uuid-old",
      external_id: legacyExternalId({
        dateSort: "2026-06-09",
        title: "PROMINENTEN BENEFIZSPIEL",
        city: "KOBLENZ",
        venue: null,
      }),
      title: "PROMINENTEN BENEFIZSPIEL",
      start_at: "2026-06-09T00:00:00.000Z",
      city: "KOBLENZ",
      content_hash: "old",
      is_visible: true,
      participation_count: 15,
      has_travel_note: true,
    },
  ];

  it("matches by legacy hash when feed event_id is new", () => {
    const feed = normalizeArtistflowEvent({
      event_id: "jobdate_new_id",
      kind: "event",
      dateSort: "2026-06-09",
      title: "PROMINENTEN BENEFIZSPIEL",
      city: "KOBLENZ",
    });
    const match = matchExistingExternalEvent(feed, rows);
    expect(match?.id).toBe("uuid-old");
  });

  it("does not reuse the same row for a second feed item", () => {
    const feedA = normalizeArtistflowEvent({
      event_id: "jobdate_a",
      dateSort: "2026-06-09",
      title: "PROMINENTEN BENEFIZSPIEL",
      city: "KOBLENZ",
    });
    const feedB = normalizeArtistflowEvent({
      event_id: "jobdate_b",
      dateSort: "2026-06-14",
      title: "CAMPING HOLMERNHOF",
      city: "HOLMERNHOF",
    });
    const used = new Set<string>();
    const matchA = matchExistingExternalEvent(feedA, rows, { excludeIds: used });
    if (matchA) used.add(matchA.id);
    const matchB = matchExistingExternalEvent(feedB, rows, { excludeIds: used });
    expect(matchA?.id).toBe("uuid-old");
    expect(matchB).toBeNull();
  });

  it("prefers row with participations when multiple title/day matches", () => {
    const feed = normalizeArtistflowEvent({
      event_id: "jobdate_x",
      dateSort: "2026-06-09",
      title: "PROMINENTEN BENEFIZSPIEL",
      city: "KOBLENZ",
    });
    const multi = [
      ...rows,
      {
        id: "uuid-empty",
        external_id: "other",
        title: "PROMINENTEN BENEFIZSPIEL",
        start_at: "2026-06-09T12:00:00.000Z",
        city: "KOBLENZ",
        content_hash: "x",
        is_visible: true,
        participation_count: 0,
      },
    ];
    expect(matchExistingExternalEvent(feed, multi)?.id).toBe("uuid-old");
  });
});
