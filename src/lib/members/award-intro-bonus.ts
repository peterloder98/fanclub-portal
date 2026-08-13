import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { introProgressFromAnswers } from "@/lib/members/intro-progress";
import { STECKBRIEF_BONUS_POINTS } from "@/lib/members/intro-progress";
import type { MemberIntroAnswers } from "@/lib/members/intro-questions";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { isHiddenProfileId } from "@/lib/members/hidden";

type ProfileIntroRow = MemberIntroAnswers;

export async function tryAwardSteckbriefBonus(userId: string): Promise<boolean> {
  if (isHiddenProfileId(userId)) return false;

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "short_bio,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return false;

  const progress = introProgressFromAnswers(profile as ProfileIntroRow);
  if (!progress.isComplete) return false;

  const { data: existing } = await admin
    .from("points_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", "profile_intro_complete")
    .limit(1)
    .maybeSingle();

  if (existing) return false;

  const { error: insertErr } = await admin.from("points_transactions").insert({
    user_id: userId,
    points: STECKBRIEF_BONUS_POINTS,
    reason: "profile_intro_complete",
    entity_type: "profile",
    entity_id: userId,
  });

  if (insertErr) {
    if (/duplicate|unique/i.test(insertErr.message)) return false;
    console.error("[intro-bonus] insert failed:", insertErr.message);
    return false;
  }

  await createUserNotification({
    userId,
    kind: NOTIFICATION_KINDS.introSteckbriefComplete,
    title: "Steckbrief vollständig",
    body: `Dein Kennenlernen ist komplett — du erhältst ${STECKBRIEF_BONUS_POINTS} Anni-Stars.`,
    linkUrl: "/profile#kennenlernen",
    linkLabel: "Zum Profil",
    metadata: { intro_bonus: true },
  }).catch(console.error);

  return true;
}
