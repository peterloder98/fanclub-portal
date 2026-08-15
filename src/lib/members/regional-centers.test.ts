import { describe, expect, it } from "vitest";
import { clusterMemberPoints } from "./cluster-map";
import {
  needsRegionalSnap,
  snapToRegionalCenter,
} from "./regional-centers";
import { isValidMapCoord } from "./geocode-plz";

describe("snapToRegionalCenter", () => {
  it("snaps Germering-area coords to München (DE)", () => {
    const c = snapToRegionalCenter(48.1333, 11.3667, "Germering", "DE");
    expect(c.name).toBe("München");
    expect(c.country).toBe("DE");
  });

  it("snaps Eisenach to Erfurt, never to NL", () => {
    const c = snapToRegionalCenter(50.9798, 10.3147, "Eisenach", "DE");
    expect(c.name).toBe("Erfurt");
    expect(c.country).toBe("DE");
  });

  it("keeps NL members in NL (Almelo → Almelo/Enschede area, not Münster)", () => {
    const c = snapToRegionalCenter(52.357, 6.6626, "Almelo", "NL");
    expect(c.country).toBe("NL");
    expect(["Almelo", "Hengelo", "Enschede"]).toContain(c.name);
  });

  it("does not assign DE members to foreign centers even with wild coords", () => {
    // Zippopotam-Bug-Simulation: lat 16056 → früher „nächstes“ Zentrum Rotterdam
    const c = snapToRegionalCenter(16056, 50.9744, "Eisenach", "DE");
    expect(c.country).toBe("DE");
    expect(c.name).not.toBe("Rotterdam");
  });

  it("prefers matching city name when provided", () => {
    const c = snapToRegionalCenter(52.52, 13.4, "Hamburg", "DE");
    expect(c.name).toBe("Hamburg");
  });

  it("does not match tiny prefixes like Ei → Eindhoven", () => {
    const c = snapToRegionalCenter(50.98, 10.31, "Ei", "DE");
    expect(c.country).toBe("DE");
    expect(c.name).not.toBe("Eindhoven");
  });

  it("flags non-center coords as needing snap", () => {
    expect(needsRegionalSnap(48.1333, 11.3667, 3, "DE")).toBe(true);
    const munich = snapToRegionalCenter(48.1351, 11.582, null, "DE");
    expect(needsRegionalSnap(munich.lat, munich.lng, 3, "DE")).toBe(false);
  });
});

describe("isValidMapCoord", () => {
  it("rejects Zippopotam garbage for Eisenach PLZ", () => {
    expect(isValidMapCoord(16056, 50.9744)).toBe(false);
    expect(isValidMapCoord(50.9744, 10.319)).toBe(true);
  });
});

describe("clusterMemberPoints", () => {
  it("aggregates nearby members into one regional cluster", () => {
    const clusters = clusterMemberPoints([
      {
        userId: "1",
        postalCode: "82110",
        city: "Germering",
        country: "DE",
        lat: 48.1333,
        lng: 11.3667,
        name: "Alice",
        avatarUrl: null,
      },
      {
        userId: "2",
        postalCode: "80331",
        city: "München",
        country: "DE",
        lat: 48.1374,
        lng: 11.5755,
        name: "Bob",
        avatarUrl: null,
      },
      {
        userId: "3",
        postalCode: "20095",
        city: "Hamburg",
        country: "DE",
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
    expect(munich?.lat).toBeCloseTo(48.1351, 3);
    expect(munich?.lng).toBeCloseTo(11.582, 3);
  });

  it("does not mix NL and DE into one region", () => {
    const clusters = clusterMemberPoints([
      {
        userId: "nl1",
        postalCode: "7600",
        city: "Almelo",
        country: "NL",
        lat: 52.357,
        lng: 6.6626,
        name: "Henri",
        avatarUrl: null,
      },
      {
        userId: "de1",
        postalCode: "48143",
        city: "Münster",
        country: "DE",
        lat: 51.9607,
        lng: 7.6261,
        name: "Max",
        avatarUrl: null,
      },
    ]);
    expect(clusters).toHaveLength(2);
    const nl = clusters.find((c) => c.members.some((m) => m.userId === "nl1"));
    const de = clusters.find((c) => c.members.some((m) => m.userId === "de1"));
    expect(nl?.regionName).not.toBe("Münster");
    expect(de?.regionName).toBe("Münster");
  });
});
