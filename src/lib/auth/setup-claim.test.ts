import { describe, expect, it } from "vitest";
import {
  createSetupClaimToken,
  verifySetupClaimToken,
} from "@/lib/auth/setup-claim";

describe("setup-claim", () => {
  it("round-trips a valid claim", () => {
    process.env.SMTP_SECRET = "test-secret-at-least-16-chars";
    const token = createSetupClaimToken(
      "71fe8c96-b3e0-4f98-96a3-b90c2ea2e296",
      "daniel.thielboerger@gmx.de",
      3600,
    );
    const parsed = verifySetupClaimToken(token);
    expect(parsed?.userId).toBe("71fe8c96-b3e0-4f98-96a3-b90c2ea2e296");
    expect(parsed?.email).toBe("daniel.thielboerger@gmx.de");
  });

  it("rejects tampered tokens", () => {
    process.env.SMTP_SECRET = "test-secret-at-least-16-chars";
    const token = createSetupClaimToken("user-1", "a@b.de", 3600);
    const bad = `${token.slice(0, -4)}xxxx`;
    expect(verifySetupClaimToken(bad)).toBeNull();
  });

  it("rejects expired tokens", () => {
    process.env.SMTP_SECRET = "test-secret-at-least-16-chars";
    const token = createSetupClaimToken("user-1", "a@b.de", -10);
    expect(verifySetupClaimToken(token)).toBeNull();
  });
});
