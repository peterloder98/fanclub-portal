import { describe, expect, it } from "vitest";
import { mapAuthError, mapAuthErrorMessage } from "./map-auth-error";

describe("mapAuthErrorMessage", () => {
  it("maps email rate limit exceeded", () => {
    expect(mapAuthErrorMessage("email rate limit exceeded")).toBe(
      "Zu viele Versuche. Bitte warte einige Minuten oder melde dich beim Vorstand — wir schicken dir den Link manuell.",
    );
  });

  it("maps rate limit variants", () => {
    expect(mapAuthErrorMessage("Rate limit exceeded")).toContain("Zu viele Versuche");
    expect(mapAuthErrorMessage("over_email_send_rate_limit")).toContain("Zu viele Versuche");
  });

  it("passes through other messages", () => {
    expect(mapAuthErrorMessage("Invalid login credentials")).toBe("Invalid login credentials");
  });

  it("uses fallback for empty", () => {
    expect(mapAuthErrorMessage("", "Fallback")).toBe("Fallback");
  });
});

describe("mapAuthError", () => {
  it("reads Error.message", () => {
    expect(mapAuthError(new Error("email rate limit exceeded"))).toContain("Zu viele Versuche");
  });
});
