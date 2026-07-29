import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_MAX_PER_DAY = 3;
export const REFERRAL_MAX_PER_WEEK = 10;
export const REFERRAL_EMAIL_COOLDOWN_DAYS = 14;

function startOfLocalDayIso(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function daysAgoIso(days: number, d = new Date()) {
  return new Date(d.getTime() - days * 86_400_000).toISOString();
}

export type ReferralLimitOk = { ok: true };
export type ReferralLimitBlocked = { ok: false; message: string };
export type ReferralLimitResult = ReferralLimitOk | ReferralLimitBlocked;

/** Prüft Tages-/Wochenlimit und 14-Tage-Cooldown derselben Empfänger-Adresse. */
export async function assertReferralSendAllowed(
  admin: SupabaseClient,
  senderId: string,
  recipientEmail: string,
): Promise<ReferralLimitResult> {
  const email = recipientEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, message: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }

  const dayStart = startOfLocalDayIso();
  const weekStart = daysAgoIso(7);
  const cooldownStart = daysAgoIso(REFERRAL_EMAIL_COOLDOWN_DAYS);

  const [{ count: dayCount, error: dayErr }, { count: weekCount, error: weekErr }, { data: recentSame, error: sameErr }] =
    await Promise.all([
      admin
        .from("membership_referral_sends")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", senderId)
        .gte("created_at", dayStart),
      admin
        .from("membership_referral_sends")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", senderId)
        .gte("created_at", weekStart),
      admin
        .from("membership_referral_sends")
        .select("id,created_at")
        .eq("sender_id", senderId)
        .ilike("recipient_email", email)
        .gte("created_at", cooldownStart)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (dayErr) throw new Error(dayErr.message);
  if (weekErr) throw new Error(weekErr.message);
  if (sameErr) throw new Error(sameErr.message);

  if ((dayCount ?? 0) >= REFERRAL_MAX_PER_DAY) {
    return {
      ok: false,
      message: `Du kannst heute maximal ${REFERRAL_MAX_PER_DAY} Einladungen senden. Bitte versuche es morgen erneut.`,
    };
  }
  if ((weekCount ?? 0) >= REFERRAL_MAX_PER_WEEK) {
    return {
      ok: false,
      message: `Du kannst maximal ${REFERRAL_MAX_PER_WEEK} Einladungen in 7 Tagen senden. Bitte warte etwas.`,
    };
  }
  if (recentSame?.id) {
    return {
      ok: false,
      message: `An diese E-Mail-Adresse hast du in den letzten ${REFERRAL_EMAIL_COOLDOWN_DAYS} Tagen bereits eine Einladung geschickt.`,
    };
  }

  return { ok: true };
}
