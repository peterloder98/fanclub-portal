"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MEMBER_INTRO_QUESTIONS,
  normalizeShortBio,
  type MemberIntroAnswers,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";

function trimAnswer(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t.slice(0, 800) : null;
}

export async function saveMyIntroAnswers(
  input: MemberIntroAnswers & { dismissOnboarding?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const patch: Record<string, string | null> = {};
  for (const q of MEMBER_INTRO_QUESTIONS) {
    if (q.key in input) {
      patch[q.key] = trimAnswer(input[q.key as MemberIntroKey]);
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
  return { ok: true };
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

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();

  await admin.from("profiles").update({ last_app_active_at: now }).eq("id", user.id);

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
