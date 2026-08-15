import { describe, expect, it } from "vitest";
import { resolveAppRegistrationStatus } from "@/lib/membership/app-registration";

describe("forgot-password registration fallback", () => {
  it("treats last_sign_in / last_app_active as registered when status columns are absent", () => {
    expect(
      resolveAppRegistrationStatus({
        status: undefined,
        registeredAt: undefined,
        lastAppActiveAt: "2026-08-14T11:31:04.236Z",
        lastSignInAt: "2026-08-13T17:25:48.729Z",
      }),
    ).toBe("registered");
  });

  it("treats password-set metadata as registered without profile columns", () => {
    expect(
      resolveAppRegistrationStatus({
        passwordSetAt: "2026-08-15T12:00:00.000Z",
      }),
    ).toBe("registered");
  });
});
