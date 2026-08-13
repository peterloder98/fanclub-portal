import { describe, expect, it } from "vitest";
import {
  FORGOT_PASSWORD_EMAIL_COOLDOWN_SECONDS,
  FORGOT_PASSWORD_IP_MAX_PER_HOUR,
  FORGOT_PASSWORD_OK_DE,
  FORGOT_PASSWORD_RATE_LIMIT_DE,
} from "./forgot-password-request";

describe("forgot-password-request constants", () => {
  it("uses a soft-launch friendly cooldown", () => {
    expect(FORGOT_PASSWORD_EMAIL_COOLDOWN_SECONDS).toBe(10 * 60);
    expect(FORGOT_PASSWORD_IP_MAX_PER_HOUR).toBe(20);
  });

  it("has clear German copy without soft-launch email-outage wording", () => {
    expect(FORGOT_PASSWORD_RATE_LIMIT_DE).toContain("10 Minuten");
    expect(FORGOT_PASSWORD_OK_DE).toContain("neueste Mail");
    expect(FORGOT_PASSWORD_OK_DE.toLowerCase()).not.toContain("wieder läuft");
  });
});
