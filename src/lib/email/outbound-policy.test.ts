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

  it("defaults to test mode before go-live when env unset", () => {
    delete process.env.EMAIL_OUTBOUND_MODE;
    expect(getOutboundEmailMode(new Date("2026-08-15T12:00:00.000Z"))).toBe("test");
  });

  it("defaults to live mode after go-live when env unset", () => {
    delete process.env.EMAIL_OUTBOUND_MODE;
    expect(getOutboundEmailMode(new Date("2026-08-16T12:00:00.000Z"))).toBe("live");
  });

  it("respects explicit test mode even after go-live", () => {
    process.env.EMAIL_OUTBOUND_MODE = "test";
    expect(getOutboundEmailMode(new Date("2026-08-16T12:00:00.000Z"))).toBe("test");
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
