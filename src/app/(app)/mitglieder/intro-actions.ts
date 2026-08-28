"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MEMBER_INTRO_QUESTIONS,
  normalizeIntroAnswer,
  normalizeShortBio,
  type MemberIntroAnswers,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";
import { introProgressFromAnswers } from "@/lib/members/intro-progress";
import { tryAwardSteckbriefBonus } from "@/lib/members/award-intro-bonus";
import { isBrowseOnlyProfileId } from "@/lib/members/hidden";
import { SPECTATOR_WRITE_BLOCKED_MESSAGE } from "@/lib/portal-launch";

export async function saveMyIntroAnswers(
  input: MemberIntroAnswers & { dismissOnboarding?: boolean },
): Promise<
  | { ok: true; bonusAwarded?: boolean; introComplete?: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (isBrowseOnlyProfileId(user.id)) {
    return { ok: false, error: SPECTATOR_WRITE_BLOCKED_MESSAGE };
  }

  const patch: Record<string, string | null> = {};
  for (const q of MEMBER_INTRO_QUESTIONS) {
    if (q.key in input) {
      patch[q.key] = normalizeIntroAnswer(input[q.key as MemberIntroKey]);
    }
  }
  if ("short_bio" in input) {
    patch.short_bio = normalizeShortBio(input.short_bio);
  }
  if (input.dismissOnboarding) {
    patch.intro_onboarding_dismissed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  const progressInput: MemberIntroAnswers = {
    short_bio: normalizeShortBio(input.short_bio),
  };
  for (const q of MEMBER_INTRO_QUESTIONS) {
    progressInput[q.key] = normalizeIntroAnswer(input[q.key]);
  }
  const progress = introProgressFromAnswers(progressInput);
  let bonusAwarded = false;
  if (progress.isComplete) {
    bonusAwarded = await tryAwardSteckbriefBonus(user.id);
  }

  return { ok: true, bonusAwarded, introComplete: progress.isComplete };
}

export async function ensureSteckbriefBonusAction(): Promise<
  | { ok: true; bonusAwarded: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (isBrowseOnlyProfileId(user.id)) {
    return { ok: false, error: SPECTATOR_WRITE_BLOCKED_MESSAGE };
  }
  const bonusAwarded = await tryAwardSteckbriefBonus(user.id);
  return { ok: true, bonusAwarded };
}

export async function dismissIntroOnboarding(): Promise<{ ok: true } | { ok: false; error: string }> {
  return saveMyIntroAnswers({ dismissOnboarding: true });
}

/** Heartbeat: last_app_active_at + Tageseintrag inkl. Zugriffszähler. */
export async function pingAppActivity(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (isBrowseOnlyProfileId(user.id)) return;

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();

  // App-Aktivität = registriert (Spalte syncen, falls noch „open“)
  const { data: regProfile } = await admin
    .from("profiles")
    .select("app_registration_status,app_registered_at")
    .eq("id", user.id)
    .maybeSingle();
  const profilePatch: Record<string, string> = { last_app_active_at: now };
  if (
    regProfile &&
    regProfile.app_registration_status !== "deleted" &&
    regProfile.app_registration_status !== "registered"
  ) {
    profilePatch.app_registration_status = "registered";
    if (!regProfile.app_registered_at) {
      profilePatch.app_registered_at = now;
    }
  }
  const { error: activityErr } = await admin.from("profiles").update(profilePatch).eq("id", user.id);
  if (activityErr && /app_registration_status|does not exist/i.test(activityErr.message)) {
    await admin.from("profiles").update({ last_app_active_at: now }).eq("id", user.id);
  }

  const { data: existing } = await admin
    .from("app_activity_days")
    .select("hit_count")
    .eq("user_id", user.id)
    .eq("activity_date", today)
    .maybeSingle();

  const nextHits = (typeof existing?.hit_count === "number" ? existing.hit_count : 0) + 1;
  const { error } = await admin.from("app_activity_days").upsert(
    { user_id: user.id, activity_date: today, hit_count: nextHits },
    { onConflict: "user_id,activity_date" },
  );
  if (error) {
    // Spalte hit_count fehlt ggf. vor Migration 105
    await admin.from("app_activity_days").upsert(
      { user_id: user.id, activity_date: today },
      { onConflict: "user_id,activity_date", ignoreDuplicates: true },
    );
  }
}
