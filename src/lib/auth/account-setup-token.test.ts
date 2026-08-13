import { describe, expect, it } from "vitest";
import {
  buildAccountSetupUrl,
  generateAccountSetupTokenPlain,
  hashAccountSetupToken,
} from "@/lib/auth/account-setup-token";

describe("account-setup-token", () => {
  it("hashes stably and generates high-entropy tokens", () => {
    const a = generateAccountSetupTokenPlain();
    const b = generateAccountSetupTokenPlain();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashAccountSetupToken(a.token));
    expect(a.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(a.token.length).toBeGreaterThanOrEqual(40);
  });

  it("builds setup URL with setup_token query", () => {
    const url = buildAccountSetupUrl("abcXYZ", "https://fanclub.anniperka.de");
    expect(url).toBe(
      "https://fanclub.anniperka.de/setup-account?setup_token=abcXYZ",
    );
  });
});
