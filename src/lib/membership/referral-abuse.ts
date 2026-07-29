import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyAllAdmins } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { notifyAdminsReferralAbuse } from "@/lib/email/referral-abuse-notify";
import { profileDisplayName } from "@/lib/profiles/display";

const GRACE_DAYS = 14;
const STALE_FAIL_MIN = 5;
const BURST_WINDOW_DAYS = 30;
const BURST_MIN = 8;
const BURST_STALE_MIN = 3;
const LOW_CONVERSION_RATE = 0.2;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "temp-mail.org",
  "discard.email",
]);

type SendRow = {
  id: string;
  recipient_email: string;
  recipient_first_name: string | null;
  recipient_last_name: string | null;
  created_at: string;
  link_opened_at: string | null;
  approved_at: string | null;
  converted_application_id: string | null;
  converted_user_id: string | null;
};

function daysAgo(iso: string, now = Date.now()) {
  return (now - new Date(iso).getTime()) / 86_400_000;
}

function isConverted(s: SendRow) {
  return Boolean(s.approved_at || s.converted_application_id || s.converted_user_id);
}

function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function similarNameCluster(sends: SendRow[]): boolean {
  const names = sends
    .map((s) => ({
      first: (s.recipient_first_name ?? "").trim().toLowerCase(),
      last: (s.recipient_last_name ?? "").trim().toLowerCase(),
    }))
    .filter((n) => n.first.length >= 3 && n.last.length >= 3);
  if (names.length < 4) return false;

  // Gleiche Vor- und Nachnamen-Präfixe (4 Zeichen) deuten auf Fantasie-Serien hin
  const keys = names.map((n) => `${n.first.slice(0, 4)}|${n.last.slice(0, 4)}`);
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts.values()].some((c) => c >= 4);
}

export type SuspicionResult = {
  suspicious: boolean;
  reasons: string[];
  sendIds: string[];
};

export function evaluateReferralSuspicion(sends: SendRow[], now = Date.now()): SuspicionResult {
  const reasons: string[] = [];
  if (!sends.length) return { suspicious: false, reasons, sendIds: [] };

  const converted = sends.filter(isConverted);
  const conversionRate = converted.length / sends.length;
  const stale = sends.filter((s) => daysAgo(s.created_at, now) >= GRACE_DAYS);
  const staleFailed = stale.filter((s) => !isConverted(s));
  const recent = sends.filter((s) => daysAgo(s.created_at, now) <= BURST_WINDOW_DAYS);
  const recentConverted = recent.filter(isConverted);
  const recentStaleFailed = recent.filter(
    (s) => daysAgo(s.created_at, now) >= GRACE_DAYS && !isConverted(s),
  );

  if (
    staleFailed.length >= STALE_FAIL_MIN &&
    conversionRate < LOW_CONVERSION_RATE
  ) {
    reasons.push(
      `${staleFailed.length} Einladungen älter als ${GRACE_DAYS} Tage ohne Anmeldung (Conversion ${(conversionRate * 100).toFixed(0)} %)`,
    );
  }

  if (
    recent.length >= BURST_MIN &&
    recentConverted.length === 0 &&
    recentStaleFailed.length >= BURST_STALE_MIN
  ) {
    reasons.push(
      `${recent.length} Einladungen in ${BURST_WINDOW_DAYS} Tagen ohne erfolgreiche Anmeldung (${recentStaleFailed.length} davon ≥${GRACE_DAYS} Tage offen)`,
    );
  }

  const emailCounts = new Map<string, number>();
  for (const s of sends) {
    const e = s.recipient_email.trim().toLowerCase();
    emailCounts.set(e, (emailCounts.get(e) ?? 0) + 1);
  }
  const repeated = [...emailCounts.entries()].filter(([, n]) => n >= 2);
  for (const [email, n] of repeated) {
    const anyConverted = sends.some(
      (s) => s.recipient_email.trim().toLowerCase() === email && isConverted(s),
    );
    if (!anyConverted && n >= 2) {
      reasons.push(`Mehrfach an ${email} eingeladen (${n}×) ohne Anmeldung`);
    }
  }

  const disposable = sends.filter((s) => DISPOSABLE_DOMAINS.has(emailDomain(s.recipient_email)));
  if (disposable.length >= 2) {
    reasons.push(`${disposable.length} Einladungen an verdächtige Einmal-Mail-Domains`);
  }

  if (similarNameCluster(sends) && conversionRate < LOW_CONVERSION_RATE && sends.length >= 4) {
    reasons.push("Auffällig ähnliche Empfänger-Namen bei mehreren Einladungen");
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    sendIds: sends.map((s) => s.id),
  };
}

async function holdReferralPoints(
  admin: SupabaseClient,
  referrerId: string,
  sendIds: string[],
): Promise<string[]> {
  if (!sendIds.length) return [];
  const { data: txs, error } = await admin
    .from("points_transactions")
    .select("id")
    .eq("user_id", referrerId)
    .eq("reason", "membership_referral")
    .eq("entity_type", "membership_referral")
    .in("entity_id", sendIds)
    .is("held_at", null);

  if (error) {
    if (/held_at|does not exist/i.test(error.message)) {
      console.warn("[referral-abuse] held_at fehlt — Migration 123 ausführen");
      return [];
    }
    throw new Error(error.message);
  }

  const ids = (txs ?? []).map((t) => t.id);
  if (!ids.length) return [];

  const { error: updErr } = await admin
    .from("points_transactions")
    .update({ held_at: new Date().toISOString() })
    .in("id", ids)
    .is("held_at", null);

  if (updErr) throw new Error(updErr.message);
  return ids;
}

/** Prüft einen Absender; bei Verdacht Hold + stiller Admin-Alarm. */
export async function evaluateAndMaybeFlagReferrer(
  admin: SupabaseClient,
  referrerUserId: string,
): Promise<{ flagged: boolean; reviewId: string | null }> {
  const { data: openExisting } = await admin
    .from("membership_referral_reviews")
    .select("id")
    .eq("referrer_user_id", referrerUserId)
    .eq("status", "open")
    .maybeSingle();

  if (openExisting?.id) {
    return { flagged: false, reviewId: openExisting.id };
  }

  const { data: sends, error } = await admin
    .from("membership_referral_sends")
    .select(
      "id,recipient_email,recipient_first_name,recipient_last_name,created_at,link_opened_at,approved_at,converted_application_id,converted_user_id",
    )
    .eq("sender_id", referrerUserId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(error.message);

  const rows = (sends ?? []) as SendRow[];
  const verdict = evaluateReferralSuspicion(rows);
  if (!verdict.suspicious) {
    return { flagged: false, reviewId: null };
  }

  const holdSendIds = rows.filter((s) => !isConverted(s)).map((s) => s.id);
  const heldTxIds = await holdReferralPoints(admin, referrerUserId, holdSendIds);

  const { data: review, error: revErr } = await admin
    .from("membership_referral_reviews")
    .insert({
      referrer_user_id: referrerUserId,
      status: "open",
      reasons: verdict.reasons,
      referral_send_ids: verdict.sendIds,
      points_transaction_ids: heldTxIds,
    })
    .select("id")
    .maybeSingle();

  if (revErr) {
    if (/membership_referral_reviews|does not exist/i.test(revErr.message)) {
      console.warn("[referral-abuse] Tabelle fehlt — Migration 123 ausführen");
      return { flagged: false, reviewId: null };
    }
    if (revErr.code === "23505") {
      return { flagged: false, reviewId: null };
    }
    throw new Error(revErr.message);
  }

  const reviewId = review?.id ?? null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email")
    .eq("id", referrerUserId)
    .maybeSingle();

  const referrerName = profile ? profileDisplayName(profile) : "Mitglied";
  const referrerEmail = profile?.email?.trim() || "—";

  const sendLines = rows.slice(0, 25).map((s) => {
    const name = [s.recipient_first_name, s.recipient_last_name].filter(Boolean).join(" ") || "—";
    const when = new Date(s.created_at).toLocaleString("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    let status = "offen";
    if (isConverted(s)) status = "Anmeldung/Freigabe";
    else if (s.link_opened_at) status = "Link geöffnet";
    return `• ${name} <${s.recipient_email}> — ${when} — ${status}`;
  });

  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const reviewUrl = base
    ? `${base}/admin/referrals?tab=pruefung`
    : "/admin/referrals?tab=pruefung";

  await notifyAllAdmins({
    kind: NOTIFICATION_KINDS.referralAbuseReview,
    title: "Prüfung: Auffällige Einladungen",
    body: `${referrerName}: ${verdict.reasons[0] ?? "Verdacht bei Empfehlungen"}`,
    linkUrl: reviewUrl,
    linkLabel: "Zur Prüfung",
    metadata: { reviewId, referrerUserId },
  });

  await notifyAdminsReferralAbuse({
    referrerName,
    referrerEmail,
    reasons: verdict.reasons,
    sendsList: sendLines.join("\n"),
    reviewUrl,
  }).catch((e) => console.error("[referral-abuse] admin email:", e));

  if (reviewId) {
    await admin
      .from("membership_referral_reviews")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", reviewId);
  }

  return { flagged: true, reviewId };
}

/** Täglicher Scan aller Absender mit Aktivität in den letzten 90 Tagen. */
export async function runReferralAbuseScan(admin: SupabaseClient) {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: recent, error } = await admin
    .from("membership_referral_sends")
    .select("sender_id")
    .gte("created_at", since);

  if (error) {
    if (/does not exist/i.test(error.message)) {
      return { scanned: 0, flagged: 0, error: error.message };
    }
    throw new Error(error.message);
  }

  const senderIds = [...new Set((recent ?? []).map((r) => r.sender_id).filter(Boolean))] as string[];
  let flagged = 0;
  for (const id of senderIds) {
    const result = await evaluateAndMaybeFlagReferrer(admin, id);
    if (result.flagged) flagged += 1;
  }
  return { scanned: senderIds.length, flagged };
}
