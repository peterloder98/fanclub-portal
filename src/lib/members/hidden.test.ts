import { describe, expect, it } from "vitest";
import {
  isHiddenProfileId,
  memberProfileHref,
  SYSTEM_HIDDEN_PROFILE_IDS,
} from "@/lib/members/hidden";

const PETER_ID = "1b70d88f-e28d-48f3-b3cb-646eaf06f19a";

describe("hidden / Geist profiles", () => {
  it("kennt Peter Loder als System-Geist", () => {
    expect(SYSTEM_HIDDEN_PROFILE_IDS.has(PETER_ID)).toBe(true);
    expect(isHiddenProfileId(PETER_ID)).toBe(true);
  });

  it("liefert keinen Mitglieder-Link für Geister", () => {
    expect(memberProfileHref(PETER_ID)).toBeNull();
    expect(memberProfileHref(null)).toBeNull();
    expect(memberProfileHref(undefined)).toBeNull();
  });

  it("liefert den Portal-Pfad für normale Mitglieder", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    expect(memberProfileHref(id)).toBe(`/mitglieder/${id}`);
  });
});
