import { describe, expect, it } from "vitest";
import { BROWSE_ONLY_PROFILE_IDS } from "@/lib/members/hidden";
import {
  ANNI_MGMT_PETER_PROFILE_ID,
  canAccessAnniManagementFinance,
  canInviteAnniManagementUsers,
  isAnniManagementOnlyUser,
  postLoginPathForAnniManagement,
} from "@/lib/anni-management/access";

const SPECTATOR = [...BROWSE_ONLY_PROFILE_IDS][0]!;
const BOARD_ADMIN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const JO = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const ANNI = "cccccccc-dddd-eeee-ffff-000000000000";

describe("Anni/Management-Zugang", () => {
  it("lässt Anni, Peter und Management zu", () => {
    expect(canAccessAnniManagementFinance({ userId: ANNI, role: "anni" })).toBe(true);
    expect(canAccessAnniManagementFinance({ userId: ANNI_MGMT_PETER_PROFILE_ID, role: "admin" })).toBe(
      true,
    );
    expect(
      canAccessAnniManagementFinance({ userId: JO, role: "member", isManagement: true }),
    ).toBe(true);
  });

  it("sperrt Vorstand, Mitglieder und Vorschau", () => {
    expect(canAccessAnniManagementFinance({ userId: BOARD_ADMIN, role: "admin" })).toBe(false);
    expect(canAccessAnniManagementFinance({ userId: BOARD_ADMIN, role: "member" })).toBe(false);
    expect(
      canAccessAnniManagementFinance({ userId: SPECTATOR, role: "member", isManagement: true }),
    ).toBe(false);
    expect(
      canAccessAnniManagementFinance({
        userId: ANNI_MGMT_PETER_PROFILE_ID,
        role: "admin",
        browseOnly: true,
      }),
    ).toBe(false);
  });

  it("erlaubt Einladen nur Peter und Anni", () => {
    expect(canInviteAnniManagementUsers({ userId: ANNI_MGMT_PETER_PROFILE_ID, role: "admin" })).toBe(
      true,
    );
    expect(canInviteAnniManagementUsers({ userId: ANNI, role: "anni" })).toBe(true);
    expect(
      canInviteAnniManagementUsers({ userId: JO, role: "member", isManagement: true }),
    ).toBe(false);
    expect(canInviteAnniManagementUsers({ userId: BOARD_ADMIN, role: "admin" })).toBe(false);
  });

  it("landet nur reines Management nach Login auf der Abrechnung", () => {
    expect(
      isAnniManagementOnlyUser({ userId: JO, role: "member", isManagement: true }),
    ).toBe(true);
    expect(
      postLoginPathForAnniManagement({ userId: JO, role: "member", isManagement: true }, "/dashboard"),
    ).toBe("/anni-abrechnung");
    expect(
      postLoginPathForAnniManagement({ userId: ANNI, role: "anni" }, "/dashboard"),
    ).toBe("/dashboard");
    expect(
      postLoginPathForAnniManagement(
        { userId: JO, role: "member", isManagement: true },
        "/events",
      ),
    ).toBe("/events");
  });
});
