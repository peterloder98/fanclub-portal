import { afterEach, describe, expect, it } from "vitest";
import {
  clearOutboundTestAllowlistCache,
  evaluateOutboundEmailAgainstAllowlist,
  getOutboundEmailMode,
} from "./outbound-policy";

describe("outbound email policy", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    clearOutboundTestAllowlistCache();
  });

  it("defaults to test mode", () => {
    delete process.env.EMAIL_OUTBOUND_MODE;
    expect(getOutboundEmailMode()).toBe("test");
  });

  it("blocks recipients not on allowlist in test mode", () => {
    const allowlist = new Set(["vorstand@example.com", "app@fanclub.de"]);
    const decision = evaluateOutboundEmailAgainstAllowlist("member@real.de", allowlist);
    expect(decision.allow).toBe(false);
  });

  it("allows allowlisted recipients in test mode", () => {
    const allowlist = new Set(["vorstand@example.com", "app@fanclub.de"]);
    expect(evaluateOutboundEmailAgainstAllowlist("vorstand@example.com", allowlist).allow).toBe(
      true,
    );
  });

  it("allows all in live mode via getOutboundEmailMode", () => {
    process.env.EMAIL_OUTBOUND_MODE = "live";
    expect(getOutboundEmailMode()).toBe("live");
  });
});
