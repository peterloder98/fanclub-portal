import { describe, expect, it } from "vitest";
import { formatMembershipEmailWarning } from "@/lib/smtp/email-warning";

describe("formatMembershipEmailWarning", () => {
  it("distinguishes test-mode block from missing SMTP", () => {
    const msg = formatMembershipEmailWarning({
      applicant: {
        ok: false,
        skipped: true,
        reason: "outbound_test_mode_blocked:member@example.com",
      },
    });
    expect(msg).toMatch(/Testmodus/i);
    expect(msg).not.toMatch(/Kein SMTP-Konto/);
  });

  it("keeps SMTP message for no_smtp_account", () => {
    const msg = formatMembershipEmailWarning({
      applicant: { ok: false, skipped: true, reason: "no_smtp_account" },
    });
    expect(msg).toMatch(/SMTP-Konto/);
  });
});
