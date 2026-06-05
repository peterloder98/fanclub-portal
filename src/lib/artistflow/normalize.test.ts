import { describe, expect, it } from "vitest";
import {
  canGeocodeNormalizedEvent,
  normalizeArtistflowEvent,
} from "./normalize";

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
    expect(e.kind).toBe("event");
  });

  it("uses ticketText when no URL", () => {
    const e = normalizeArtistflowEvent({
      dateSort: "2026-09-26",
      title: "Geburtstag Einkaufscenter SMC",
      city: "Frankfurt (Oder)",
      ticketText: "Eintritt frei",
      ticketHref: "",
      ticketUrl: "",
    });
    expect(e.ticket_url).toBe("Eintritt frei");
  });

  it("reads countryCode and tv fields", () => {
    const e = normalizeArtistflowEvent({
      event_id: "jobdate_tv1",
      kind: "tv",
      dateSort: "2026-06-12T20:15:00+02:00",
      title: "ZDF-Fernsehgarten",
      broadcaster: "ZDF",
      infoUrl: "https://www.zdf.de/show",
      countryCode: "",
    });
    expect(e.kind).toBe("tv");
    expect(e.broadcaster).toBe("ZDF");
    expect(e.country).toBe("DE");
    expect(e.ticket_url).toBe("https://www.zdf.de/show");
    expect(e.start_at).toBe("2026-06-12T20:15:00+02:00");
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

describe("canGeocodeNormalizedEvent", () => {
  it("requires address or postal code, not city alone", () => {
    expect(
      canGeocodeNormalizedEvent({
        kind: "event",
        address: null,
        postal_code: null,
        city: "Koblenz",
        country: "DE",
      }),
    ).toBe(false);
    expect(
      canGeocodeNormalizedEvent({
        kind: "event",
        address: "Rheingoldstraße 1",
        postal_code: "56068",
        city: "Koblenz",
        country: "DE",
      }),
    ).toBe(true);
  });

  it("skips tv entries", () => {
    expect(
      canGeocodeNormalizedEvent({
        kind: "tv",
        address: "Studio",
        postal_code: "12345",
        city: "Mainz",
        country: "DE",
      }),
    ).toBe(false);
  });
});
