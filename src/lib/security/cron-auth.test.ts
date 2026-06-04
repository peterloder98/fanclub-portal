import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { authorizeCronRequest } from "./cron-auth";

describe("authorizeCronRequest", () => {
  const prev = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = prev;
  });

  it("accepts Bearer token", () => {
    const req = new Request("http://localhost/api/cron/birthday-posts", {
      headers: { Authorization: "Bearer test-secret" },
    });
    expect(authorizeCronRequest(req)).toBe(true);
  });

  it("accepts legacy ?secret= query", () => {
    const req = new Request("http://localhost/api/cron/artistflow-sync?secret=test-secret");
    expect(authorizeCronRequest(req)).toBe(true);
  });

  it("rejects missing secret", () => {
    const req = new Request("http://localhost/api/cron/birthday-posts");
    expect(authorizeCronRequest(req)).toBe(false);
  });
});
