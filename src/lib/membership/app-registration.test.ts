import { describe, expect, it } from "vitest";
import {
  isAppRegistered,
  resolveAccountAccessFlowKind,
  resolveAppRegistrationStatus,
} from "@/lib/membership/app-registration";

describe("resolveAppRegistrationStatus / isAppRegistered", () => {
  it("honors explicit deleted", () => {
    expect(
      resolveAppRegistrationStatus({
        status: "deleted",
        lastAppActiveAt: "2026-01-01T00:00:00Z",
        lastSignInAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe("deleted");
    expect(
      isAppRegistered({
        status: "deleted",
        lastAppActiveAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("uses status=registered and registeredAt", () => {
    expect(resolveAppRegistrationStatus({ status: "registered" })).toBe("registered");
    expect(
      resolveAppRegistrationStatus({ registeredAt: "2026-08-14T10:00:00Z" }),
    ).toBe("registered");
  });

  it("falls back to activity / sign-in when columns missing or still open", () => {
    expect(
      resolveAppRegistrationStatus({
        status: undefined,
        registeredAt: undefined,
        lastAppActiveAt: "2026-08-14T11:31:04.236Z",
      }),
    ).toBe("registered");

    expect(
      resolveAppRegistrationStatus({
        status: "open",
        lastSignInAt: "2026-08-13T17:25:48.729Z",
      }),
    ).toBe("registered");
  });

  it("treats club password-set metadata as registered", () => {
    expect(
      resolveAppRegistrationStatus({
        status: "open",
        passwordSetAt: "2026-08-15T10:00:00Z",
      }),
    ).toBe("registered");
    expect(
      isAppRegistered({ passwordSetAt: "2026-08-15T10:00:00Z" }),
    ).toBe(true);
  });

  it("stays open when no signals", () => {
    expect(resolveAppRegistrationStatus({})).toBe("open");
    expect(isAppRegistered({ status: "open" })).toBe(false);
  });
});

describe("resolveAccountAccessFlowKind", () => {
  it("routes registered members to password_reset only", () => {
    expect(
      resolveAccountAccessFlowKind({
        lastAppActiveAt: "2026-08-14T11:31:04.236Z",
      }),
    ).toBe("password_reset");
    expect(
      resolveAccountAccessFlowKind({
        status: "registered",
      }),
    ).toBe("password_reset");
  });

  it("routes open members to account_setup", () => {
    expect(resolveAccountAccessFlowKind({})).toBe("account_setup");
    expect(resolveAccountAccessFlowKind({ status: "open" })).toBe("account_setup");
  });
});
