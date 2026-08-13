import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ActiveMemberRecipient } from "@/lib/members/list-active-member-recipients";

/** Abschaltbare Mitglieds-E-Mail-Kategorien (Pflichtmails haben keine Pref). */
export const MEMBER_EMAIL_PREF_KEYS = [
  "new_giveaway",
  "new_poll",
  "new_event",
  "meeting_reminders",
  "live",
  "app_activity",
] as const;

export type MemberEmailPrefKey = (typeof MEMBER_EMAIL_PREF_KEYS)[number];

export type MemberEmailPrefs = Record<MemberEmailPrefKey, boolean>;

export const DEFAULT_MEMBER_EMAIL_PREFS: MemberEmailPrefs = {
  new_giveaway: true,
  new_poll: true,
  new_event: true,
  meeting_reminders: true,
  live: true,
  app_activity: true,
};

const COLUMN_BY_KEY: Record<MemberEmailPrefKey, string> = {
  new_giveaway: "email_pref_new_giveaway",
  new_poll: "email_pref_new_poll",
  new_event: "email_pref_new_event",
  meeting_reminders: "email_pref_meeting_reminders",
  live: "email_pref_live",
  app_activity: "email_pref_app_activity",
};

export function columnForEmailPref(key: MemberEmailPrefKey): string {
  return COLUMN_BY_KEY[key];
}

export function broadcastKindToEmailPref(
  kind: "giveaway" | "poll" | "event",
): MemberEmailPrefKey {
  if (kind === "giveaway") return "new_giveaway";
  if (kind === "poll") return "new_poll";
  return "new_event";
}

export function normalizeMemberEmailPrefs(
  row: Partial<Record<string, boolean | null>> | null | undefined,
): MemberEmailPrefs {
  const out = { ...DEFAULT_MEMBER_EMAIL_PREFS };
  for (const key of MEMBER_EMAIL_PREF_KEYS) {
    const col = COLUMN_BY_KEY[key];
    const raw = row?.[col];
    if (typeof raw === "boolean") out[key] = raw;
  }
  return out;
}

export function prefsSelectColumns(): string {
  return MEMBER_EMAIL_PREF_KEYS.map((k) => COLUMN_BY_KEY[k]).join(",");
}

/** true = darf diese optionale E-Mail bekommen (fehlende Spalte = erlaubt). */
export async function userAllowsMemberEmail(
  userId: string,
  pref: MemberEmailPrefKey,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const col = COLUMN_BY_KEY[pref];
  const { data, error } = await admin
    .from("profiles")
    .select(prefsSelectColumns())
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    if (/email_pref_|does not exist/i.test(error.message)) return true;
    console.error("[member-email-prefs] load:", error.message);
    return true;
  }
  const row = (data ?? null) as Record<string, boolean | null> | null;
  return row?.[col] !== false;
}

/** Filtert Empfängerliste nach Pref; bei DB-Fehler (Migration fehlt) unverändert. */
export async function filterRecipientsByEmailPref(
  recipients: ActiveMemberRecipient[],
  pref: MemberEmailPrefKey,
): Promise<ActiveMemberRecipient[]> {
  if (!recipients.length) return recipients;

  const admin = createSupabaseAdminClient();
  const col = COLUMN_BY_KEY[pref];
  const ids = recipients.map((r) => r.userId);

  const { data, error } = await admin
    .from("profiles")
    .select(`id,${prefsSelectColumns()}`)
    .in("id", ids);
  if (error) {
    if (/email_pref_|does not exist/i.test(error.message)) return recipients;
    console.error("[member-email-prefs] filter:", error.message);
    return recipients;
  }

  const allowed = new Set<string>();
  for (const row of data ?? []) {
    const r = row as unknown as Record<string, unknown>;
    if (r[col] !== false && typeof r.id === "string") allowed.add(r.id);
  }

  return recipients.filter((r) => allowed.has(r.userId));
}
