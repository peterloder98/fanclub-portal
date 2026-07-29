import type { SupabaseClient } from "@supabase/supabase-js";
import {
  introProgressFromAnswers,
  introProgressLabel,
  STECKBRIEF_BONUS_POINTS,
} from "@/lib/members/intro-progress";
import { createUserNotification } from "@/lib/notifications/create";
import { hasNotificationDedupe } from "@/lib/notifications/dedup";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

const REMINDER_DAYS = [7, 14] as const;

function daysSince(iso: string): number {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.floor((Date.now() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export async function runIntroSteckbriefReminders(admin: SupabaseClient) {
  const { data: members, error } = await admin
    .from("memberships")
    .select("user_id,start_date")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!members?.length) return { sent: 0, skipped: 0, checked: 0 };

  const userIds = members.map((m) => m.user_id);
  const startByUser = new Map(members.map((m) => [m.user_id, m.start_date]));

  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select(
      "id,short_bio,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert,intro_reminder_count",
    )
    .in("id", userIds);

  if (profileErr) throw new Error(profileErr.message);

  let sent = 0;
  let skipped = 0;

  for (const profile of profiles ?? []) {
    const progress = introProgressFromAnswers(profile);
    if (progress.isComplete) continue;

    const reminderCount = profile.intro_reminder_count ?? 0;
    if (reminderCount >= 2) continue;

    const referenceDate = startByUser.get(profile.id);
    if (!referenceDate) continue;

    const days = daysSince(referenceDate);
    const targetDay = REMINDER_DAYS[reminderCount];
    if (days < targetDay) continue;

    const dedupeKey = `intro_reminder_${reminderCount + 1}`;
    if (
      await hasNotificationDedupe(
        profile.id,
        NOTIFICATION_KINDS.introIncompleteReminder,
        dedupeKey,
      )
    ) {
      skipped += 1;
      continue;
    }

    const label = introProgressLabel(progress);
    await createUserNotification({
      userId: profile.id,
      kind: NOTIFICATION_KINDS.introIncompleteReminder,
      title: "Dein Steckbrief wartet",
      body: `Ergänze dein Kennenlernen (${label}) — bei vollständigem Steckbrief gibt es ${STECKBRIEF_BONUS_POINTS} Anni-Stars.`,
      linkUrl: "/profile#kennenlernen",
      linkLabel: "Steckbrief ausfüllen",
      metadata: { dedupe_key: dedupeKey, filled: progress.filled, total: progress.total },
    });

    await admin
      .from("profiles")
      .update({ intro_reminder_count: reminderCount + 1 })
      .eq("id", profile.id);

    sent += 1;
  }

  return { sent, skipped, checked: profiles?.length ?? 0 };
}
