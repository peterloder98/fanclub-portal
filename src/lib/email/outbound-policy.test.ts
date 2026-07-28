import { afterEach, describe, expect, it } from "vitest";
import { evaluateOutboundEmail, getOutboundEmailMode } from "./outbound-policy";

describe("outbound email policy", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to test mode", () => {
    delete process.env.EMAIL_OUTBOUND_MODE;
    expect(getOutboundEmailMode()).toBe("test");
  });

  it("blocks recipients not on allowlist in test mode", () => {
    process.env.EMAIL_OUTBOUND_MODE = "test";
    process.env.EMAIL_OUTBOUND_ALLOWLIST = "test@example.com";
    const decision = evaluateOutboundEmail("member@real.de");
    expect(decision.allow).toBe(false);
  });

  it("allows allowlisted recipients in test mode", () => {
    process.env.EMAIL_OUTBOUND_MODE = "test";
    process.env.EMAIL_OUTBOUND_ALLOWLIST = "test@example.com";
    expect(evaluateOutboundEmail("test@example.com").allow).toBe(true);
  });

  it("allows all in live mode", () => {
    process.env.EMAIL_OUTBOUND_MODE = "live";
    expect(evaluateOutboundEmail("anyone@example.com").allow).toBe(true);
  });
});
