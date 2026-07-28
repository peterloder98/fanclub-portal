import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSmtpAccounts } from "@/lib/smtp/accounts";

export type OutboundEmailMode = "live" | "test";

export type OutboundEmailDecision =
  | { allow: true }
  | { allow: false; reason: string };

const ALLOWLIST_CACHE_MS = 5 * 60 * 1000;
let cachedAllowlist: { at: number; emails: Set<string> } | null = null;

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

function extractRecipients(to: string | string[]): string[] {
  return (Array.isArray(to) ? to : [to])
    .flatMap((entry) => entry.split(/[,;]/))
    .map(normalizeEmail)
    .filter(Boolean);
}

/** Standard: test — nur Vorstände + offizielle App-Mail bis EMAIL_OUTBOUND_MODE=live. */
export function getOutboundEmailMode(): OutboundEmailMode {
  const mode = (process.env.EMAIL_OUTBOUND_MODE ?? "test").trim().toLowerCase();
  return mode === "live" ? "live" : "test";
}

export function evaluateOutboundEmailAgainstAllowlist(
  to: string | string[],
  allowlist: Set<string>,
): OutboundEmailDecision {
  const recipients = extractRecipients(to);

  if (!recipients.length) {
    return { allow: false, reason: "outbound_test_mode_no_recipient" };
  }

  if (allowlist.size === 0) {
    return {
      allow: false,
      reason:
        "outbound_test_mode_blocked (keine Freigabeliste — Vorstands-Admins oder SMTP-Konto prüfen)",
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

async function loadAdminEmails(): Promise<string[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "admin")
      .not("email", "is", null);
    if (error) return [];
    return (data ?? [])
      .map((row) => row.email)
      .filter((e): e is string => Boolean(e?.trim()));
  } catch {
    return [];
  }
}

async function loadOfficialAppEmails(): Promise<string[]> {
  const emails: string[] = [];

  const seed = process.env.SMTP_SEED_EMAIL?.trim();
  if (seed) emails.push(seed);

  const seedReply = process.env.SMTP_SEED_REPLY_TO?.trim();
  if (seedReply) emails.push(seedReply);

  try {
    const accounts = await listSmtpAccounts();
    for (const account of accounts) {
      if (account.email?.trim()) emails.push(account.email);
      if (account.reply_to?.trim()) emails.push(account.reply_to);
    }
  } catch {
    /* ignore — env seed may still apply */
  }

  return emails;
}

/** Testmodus: nur Vorstände (role=admin) + offizielle App-E-Mail(s). */
export async function resolveOutboundTestAllowlist(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedAllowlist && now - cachedAllowlist.at < ALLOWLIST_CACHE_MS) {
    return cachedAllowlist.emails;
  }

  const combined = new Set<string>();
  for (const email of [
    ...parseAllowlist(process.env.EMAIL_OUTBOUND_ALLOWLIST),
    ...(await loadAdminEmails()),
    ...(await loadOfficialAppEmails()),
  ]) {
    combined.add(normalizeEmail(email));
  }

  cachedAllowlist = { at: now, emails: combined };
  return combined;
}

export function clearOutboundTestAllowlistCache() {
  cachedAllowlist = null;
}

export async function evaluateOutboundEmail(to: string | string[]): Promise<OutboundEmailDecision> {
  if (getOutboundEmailMode() === "live") {
    return { allow: true };
  }

  const allowlist = await resolveOutboundTestAllowlist();
  return evaluateOutboundEmailAgainstAllowlist(to, allowlist);
}
