export type OutboundEmailMode = "live" | "test";

export type OutboundEmailDecision =
  | { allow: true }
  | { allow: false; reason: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

/** Standard: test — keine E-Mails an echte Mitglieder bis EMAIL_OUTBOUND_MODE=live. */
export function getOutboundEmailMode(): OutboundEmailMode {
  const mode = (process.env.EMAIL_OUTBOUND_MODE ?? "test").trim().toLowerCase();
  return mode === "live" ? "live" : "test";
}

export function evaluateOutboundEmail(to: string | string[]): OutboundEmailDecision {
  if (getOutboundEmailMode() === "live") {
    return { allow: true };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .flatMap((entry) => entry.split(/[,;]/))
    .map(normalizeEmail)
    .filter(Boolean);

  if (!recipients.length) {
    return { allow: false, reason: "outbound_test_mode_no_recipient" };
  }

  const allowlist = parseAllowlist(process.env.EMAIL_OUTBOUND_ALLOWLIST);
  if (allowlist.size === 0) {
    return {
      allow: false,
      reason: "outbound_test_mode_blocked (keine Freigabeliste — EMAIL_OUTBOUND_ALLOWLIST setzen oder EMAIL_OUTBOUND_MODE=live)",
    };
  }

  const blocked = recipients.filter((r) => !allowlist.has(r));
  if (blocked.length) {
    return {
      allow: false,
      reason: `outbound_test_mode_blocked:${blocked.join(",")}`,
    };
  }

  return { allow: true };
}
