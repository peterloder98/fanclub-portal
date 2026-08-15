import { describe, expect, it } from "vitest";
import { clusterMemberPoints } from "./cluster-map";
import {
  needsRegionalSnap,
  snapToRegionalCenter,
} from "./regional-centers";

describe("snapToRegionalCenter", () => {
  it("snaps Germering-area coords to München", () => {
    // Germering approx
    const c = snapToRegionalCenter(48.1333, 11.3667, "Germering");
    expect(c.name).toBe("München");
  });

  it("prefers matching city name when provided", () => {
    const c = snapToRegionalCenter(52.52, 13.4, "Hamburg");
    expect(c.name).toBe("Hamburg");
  });

  it("flags non-center coords as needing snap", () => {
    // Germering — deutlich neben dem München-Zentrum
    expect(needsRegionalSnap(48.1333, 11.3667)).toBe(true);
    const munich = snapToRegionalCenter(48.1351, 11.582);
    expect(needsRegionalSnap(munich.lat, munich.lng)).toBe(false);
  });
});

describe("clusterMemberPoints", () => {
  it("aggregates nearby members into one regional cluster", () => {
    const clusters = clusterMemberPoints([
      {
        userId: "1",
        postalCode: "82110",
        city: "Germering",
        lat: 48.1333,
        lng: 11.3667,
        name: "Alice",
        avatarUrl: null,
      },
      {
        userId: "2",
        postalCode: "80331",
        city: "München",
        lat: 48.1374,
        lng: 11.5755,
        name: "Bob",
        avatarUrl: null,
      },
      {
        userId: "3",
        postalCode: "20095",
        city: "Hamburg",
        lat: 53.5511,
        lng: 9.9937,
        name: "Carla",
        avatarUrl: null,
      },
    ]);

    expect(clusters).toHaveLength(2);
    const munich = clusters.find((c) => c.regionName === "München");
    const hamburg = clusters.find((c) => c.regionName === "Hamburg");
    expect(munich?.count).toBe(2);
    expect(munich?.label).toContain("Raum München");
    expect(hamburg?.count).toBe(1);
    // Pins sit on regional centers, not home coords
    expect(munich?.lat).toBeCloseTo(48.1351, 3);
    expect(munich?.lng).toBeCloseTo(11.582, 3);
  });
});
