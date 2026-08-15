import { describe, expect, it } from "vitest";
import { resolveAppRegistrationStatus } from "@/lib/membership/app-registration";

describe("forgot-password registration fallback", () => {
  it("treats last_sign_in as registered when status columns are absent", () => {
    expect(
      resolveAppRegistrationStatus({
        status: undefined,
        registeredAt: undefined,
        lastAppActiveAt: "2026-08-14T11:31:04.236Z",
        lastSignInAt: "2026-08-13T17:25:48.729Z",
      }),
    ).toBe("registered");
  });
});
