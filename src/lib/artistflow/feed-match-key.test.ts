import { describe, expect, it } from "vitest";
import { feedMatchKey } from "./feed-match-key";

describe("feedMatchKey", () => {
  it("distinguishes same title on different Berlin days", () => {
    const a = feedMatchKey({
      kind: "event",
      title: "SCHLAGERfeeling Weihnachtstraum",
      start_at: "2026-11-29T00:00:00.000Z",
      city: "München",
    });
    const b = feedMatchKey({
      kind: "event",
      title: "SCHLAGERfeeling Weihnachtstraum",
      start_at: "2026-12-10T00:00:00.000Z",
      city: "München",
    });
    expect(a).not.toBe(b);
  });

  it("distinguishes TV events by broadcaster", () => {
    const tv = feedMatchKey({
      kind: "tv",
      title: "Immer wieder Sonntags - ARD (Live)",
      start_at: "2026-06-14T08:00:00.000Z",
      broadcaster: "ARD",
    });
    const event = feedMatchKey({
      kind: "event",
      title: "Immer wieder Sonntags - ARD (Live)",
      start_at: "2026-06-14T08:00:00.000Z",
      city: "Köln",
    });
    expect(tv).not.toBe(event);
  });
});
