import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserNotification } from "@/lib/notifications/create";
import { hasNotificationDedupe } from "@/lib/notifications/dedup";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { isCampaignActive } from "@/lib/votings/radio-campaign-types";

const BERLIN = "Europe/Berlin";

function berlinDateKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: BERLIN });
}

function berlinMorningHour(d: Date) {
  const hour = Number(
    d.toLocaleString("en-GB", { timeZone: BERLIN, hour: "numeric", hour12: false }),
  );
  return hour;
}

async function loadActiveMemberIds(admin: SupabaseClient): Promise<string[]> {
  const [{ data: memberships }, { data: admins }] = await Promise.all([
    admin.from("memberships").select("user_id").eq("status", "active"),
    admin.from("profiles").select("id").eq("role", "admin"),
  ]);
  return [
    ...new Set([
      ...((memberships ?? []).map((m) => m.user_id).filter(Boolean) as string[]),
      ...((admins ?? []).map((a) => a.id).filter(Boolean) as string[]),
    ]),
  ];
}

/** Morgens am Endtag: Erinnerung an Mitglieder ohne Klick in der laufenden Runde. */
export async function runRadioVotingLastChanceReminders(admin: SupabaseClient) {
  const now = new Date();
  if (berlinMorningHour(now) < 6 || berlinMorningHour(now) > 10) {
    return { sent: 0, skipped: "outside_morning_window" as const };
  }

  const todayKey = berlinDateKey(now);
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const linkUrl = base ? `${base}/votings` : "/votings";

  const { data: campaigns, error: cErr } = await admin
    .from("radio_voting_campaigns")
    .select("id,station,chart_name,song_title,ends_at,cycle_key,is_active")
    .eq("is_active", true);

  if (cErr) {
    if (/radio_voting_campaigns|does not exist/i.test(cErr.message)) {
      return { sent: 0, skipped: "table_missing" as const };
    }
    throw new Error(cErr.message);
  }

  const endingToday = (campaigns ?? []).filter((c) => {
    if (!isCampaignActive(c, now.getTime())) return false;
    return berlinDateKey(new Date(c.ends_at)) === todayKey;
  });

  if (!endingToday.length) return { sent: 0, skipped: "no_campaigns_today" as const };

  const memberIds = await loadActiveMemberIds(admin);
  if (!memberIds.length) return { sent: 0, skipped: "no_members" as const };

  let sent = 0;

  for (const campaign of endingToday) {
    const { data: parts } = await admin
      .from("radio_voting_participations")
      .select("user_id")
      .eq("campaign_id", campaign.id)
      .eq("cycle_key", campaign.cycle_key);

    const participated = new Set((parts ?? []).map((p) => p.user_id));
    const endTime = new Date(campaign.ends_at).toLocaleString("de-DE", {
      timeZone: BERLIN,
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const userId of memberIds) {
      if (participated.has(userId)) continue;

      const dedupeKey = `radio_last_chance:${campaign.id}:${campaign.cycle_key}:${todayKey}`;
      if (
        await hasNotificationDedupe(
          userId,
          NOTIFICATION_KINDS.radioVotingLastChance,
          dedupeKey,
        )
      ) {
        continue;
      }

      await createUserNotification({
        userId,
        kind: NOTIFICATION_KINDS.radioVotingLastChance,
        title: `Letzte Chance: ${campaign.station}`,
        body: `Heute endet ${campaign.chart_name} (${endTime} Uhr). Stimme jetzt für Anni ab — +1 Anni-Star für deine Teilnahme!`,
        linkUrl,
        linkLabel: "Zum Voting",
        metadata: {
          campaign_id: campaign.id,
          cycle_key: campaign.cycle_key,
          dedupe_key: dedupeKey,
        },
      });
      sent += 1;
    }
  }

  return { sent };
}
