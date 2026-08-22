import { describe, expect, it } from "vitest";
import {
  isSmtpAuthFailure,
  isSmtpRateOrPolicyBlock,
  outboundBurstEvery,
  outboundMinIntervalMs,
} from "@/lib/smtp/outbound-throttle";

describe("outbound-throttle", () => {
  it("detects SMTP auth failures", () => {
    expect(isSmtpAuthFailure("Invalid login: 535 Authentication credentials invalid")).toBe(
      true,
    );
    expect(isSmtpAuthFailure("Mailbox full")).toBe(false);
  });

  it("detects rate/policy blocks", () => {
    expect(isSmtpRateOrPolicyBlock("421 Too many connections")).toBe(true);
    expect(isSmtpRateOrPolicyBlock("535 bad login")).toBe(true);
  });

  it("has conservative defaults", () => {
    expect(outboundMinIntervalMs()).toBeGreaterThanOrEqual(4000);
    expect(outboundBurstEvery()).toBeGreaterThanOrEqual(5);
  });
});
