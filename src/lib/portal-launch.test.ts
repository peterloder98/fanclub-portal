import { describe, expect, it } from "vitest";
import { BROWSE_ONLY_PROFILE_IDS } from "@/lib/members/hidden";
import {
  SPECTATOR_WRITE_BLOCKED_MESSAGE,
  assertMemberCanWrite,
  canMemberChat,
  canMemberEditProfileAndIntro,
  canMemberEngageBirthdayPost,
  canMemberWrite,
} from "@/lib/portal-launch";

const SPECTATOR_ID = [...BROWSE_ONLY_PROFILE_IDS][0]!;
const OTHER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("stilles Vorschau-Konto", () => {
  it("darf nicht schreiben, chatten, liken oder Profil ändern", () => {
    expect(canMemberWrite("member", Date.now(), SPECTATOR_ID)).toBe(false);
    expect(canMemberWrite("admin", Date.now(), SPECTATOR_ID)).toBe(false);
    expect(canMemberChat("member", Date.now(), SPECTATOR_ID)).toBe(false);
    expect(canMemberEngageBirthdayPost("member", Date.now(), SPECTATOR_ID)).toBe(false);
    expect(canMemberEditProfileAndIntro("member", Date.now(), SPECTATOR_ID)).toBe(false);
  });

  it("blockiert normale Mitglieder nicht", () => {
    expect(canMemberWrite("member", Date.now(), OTHER_ID)).toBe(true);
    expect(canMemberChat("member", Date.now(), OTHER_ID)).toBe(true);
  });

  it("wirft die Nur-Lesen-Meldung", () => {
    expect(() => assertMemberCanWrite("member", Date.now(), SPECTATOR_ID)).toThrow(
      SPECTATOR_WRITE_BLOCKED_MESSAGE,
    );
  });
});
