import { describe, expect, it } from "vitest";
import { normalizeArtistflowEvent } from "./normalize";

describe("normalizeArtistflowEvent", () => {
  it("uses event_id when present", () => {
    const e = normalizeArtistflowEvent({
      event_id: "jobdate_abc",
      dateSort: "2026-06-24",
      title: "Test",
      city: "Berlin",
      ticketHref: "https://example.com",
    });
    expect(e.external_id).toBe("jobdate_abc");
    expect(e.ticket_url).toBe("https://example.com");
    expect(e.published).toBe(true);
  });

  it("falls back to stable hash when event_id missing", () => {
    const e1 = normalizeArtistflowEvent({
      dateSort: "2026-01-01",
      title: "A",
      city: "X",
      venue: "V",
    });
    const e2 = normalizeArtistflowEvent({
      dateSort: "2026-01-01",
      title: "A",
      city: "X",
      venue: "V",
    });
    expect(e1.external_id).toBe(e2.external_id);
    expect(e1.content_hash).toBe(e2.content_hash);
  });
});

