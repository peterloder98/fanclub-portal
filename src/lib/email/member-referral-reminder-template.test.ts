import { describe, expect, it } from "vitest";
import { referralReminderEligibility } from "@/lib/email/member-referral-reminder-template";

function daysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

describe("referralReminderEligibility", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("blocks converted invites", () => {
    const r = referralReminderEligibility(
      {
        created_at: daysAgo(20, now),
        last_reminder_at: null,
        approved_at: daysAgo(1, now),
        converted_application_id: null,
      },
      now,
    );
    expect(r.canRemind).toBe(false);
    expect(r.reason).toBe("converted");
  });

  it("allows first reminder after 7 days", () => {
    const r = referralReminderEligibility(
      {
        created_at: daysAgo(7, now),
        last_reminder_at: null,
        approved_at: null,
        converted_application_id: null,
      },
      now,
    );
    expect(r.canRemind).toBe(true);
    expect(r.reason).toBe("ok");
  });

  it("blocks first reminder before 7 days", () => {
    const r = referralReminderEligibility(
      {
        created_at: daysAgo(6, now),
        last_reminder_at: null,
        approved_at: null,
        converted_application_id: null,
      },
      now,
    );
    expect(r.canRemind).toBe(false);
    expect(r.reason).toBe("too_early");
    expect(r.nextAt).toBeTruthy();
  });

  it("allows next reminder after 14 days cooldown", () => {
    const r = referralReminderEligibility(
      {
        created_at: daysAgo(30, now),
        last_reminder_at: daysAgo(14, now),
        approved_at: null,
        converted_application_id: null,
      },
      now,
    );
    expect(r.canRemind).toBe(true);
  });

  it("blocks within 14 day cooldown", () => {
    const r = referralReminderEligibility(
      {
        created_at: daysAgo(30, now),
        last_reminder_at: daysAgo(10, now),
        approved_at: null,
        converted_application_id: null,
      },
      now,
    );
    expect(r.canRemind).toBe(false);
    expect(r.reason).toBe("cooldown");
  });
});
