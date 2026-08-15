import { describe, expect, it } from "vitest";
import { describeEmailSendFailure } from "@/lib/smtp/email-send-error";

describe("describeEmailSendFailure", () => {
  it("maps missing SMTP", () => {
    expect(describeEmailSendFailure({ skipped: true, reason: "no_smtp_account" })).toMatch(
      /SMTP-Konto/,
    );
  });

  it("maps outbound test mode", () => {
    expect(
      describeEmailSendFailure({
        skipped: true,
        reason: "outbound_test_mode_blocked:tfalkiese@yahoo.com",
      }),
    ).toMatch(/Testmodus/);
  });

  it("maps SMTP errors", () => {
    expect(describeEmailSendFailure({ skipped: false, error: "Connection refused" })).toBe(
      "Connection refused",
    );
  });
});
