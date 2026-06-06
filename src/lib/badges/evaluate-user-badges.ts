import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import {
  ACHIEVEMENT_TIER_ORDER,
  type AchievementTier,
  highestUnlockedTier,
  tierLabel,
} from "@/lib/badges/tiers";
import {
  formatReferralProgressDetail,
  highestReferralProTier,
  nextReferralProTier,
} from "@/lib/badges/referral-pro";

type AchievementDefinition = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  icon_key: string;
  metric: string;
  bronze_threshold: number;
  silver_threshold: number;
  gold_threshold: number;
  platinum_threshold: number;
  sort_order: number;
};

export type UserAchievementRow = {
  achievementId: string;
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  category: string;
  tier: AchievementTier;
  unlockedAt: string;
  currentValue: number;
  nextTarget: number | null;
  nextTier: AchievementTier | null;
  progressDetail?: string | null;
};

async function metricValue(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  metric: string,
): Promise<number> {
  switch (metric) {
    case "event_participations": {
      const { count } = await admin
        .from("event_participations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
    case "poll_votes": {
      const { count } = await admin
        .from("poll_votes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count ?? 0;
    }
    case "birthday_comments": {
      const { count } = await admin
        .from("points_transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reason", "birthday_comment");
      return count ?? 0;
    }
    case "membership_years": {
      const { data: membership } = await admin
        .from("memberships")
        .select("start_date")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      const startRaw = membership?.start_date;
      if (startRaw) {
        const start = new Date(startRaw);
        const now = new Date();
        let years = now.getFullYear() - start.getFullYear();
        const anniversary = new Date(start);
        anniversary.setFullYear(now.getFullYear());
        if (now < anniversary) years -= 1;
        return Math.max(0, years);
      }
      const { data: profile } = await admin
        .from("profiles")
        .select("created_at")
        .eq("id", userId)
        .maybeSingle();
      if (!profile?.created_at) return 0;
      const start = new Date(profile.created_at);
      const now = new Date();
      let years = now.getFullYear() - start.getFullYear();
      const anniversary = new Date(start);
      anniversary.setFullYear(now.getFullYear());
      if (now < anniversary) years -= 1;
      return Math.max(0, years);
    }
    case "merch_items_purchased": {
      const { data: orders } = await admin
        .from("merchandise_orders")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "shipped");
      const orderIds = (orders ?? []).map((o) => o.id);
      if (!orderIds.length) return 0;
      const { data: items } = await admin
        .from("merchandise_order_items")
        .select("quantity")
        .in("order_id", orderIds);
      return (items ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0);
    }
    default:
      return 0;
  }
}

function tiersUpTo(tier: AchievementTier): AchievementTier[] {
  const idx = ACHIEVEMENT_TIER_ORDER.indexOf(tier);
  return ACHIEVEMENT_TIER_ORDER.slice(0, idx + 1);
}

async function syncUnlockedTiers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  def: AchievementDefinition,
  value: number,
  existing: Set<string>,
): Promise<AchievementTier[]> {
  const highest = highestUnlockedTier(value, def);
  if (!highest) return [];

  const newlyUnlocked: AchievementTier[] = [];
  for (const tier of tiersUpTo(highest)) {
    const key = `${def.id}:${tier}`;
    if (existing.has(key)) continue;

    const { error } = await admin.from("user_achievements").insert({
      user_id: userId,
      achievement_id: def.id,
      tier,
      progress_snapshot: { value, metric: def.metric },
    });
    if (!error) {
      existing.add(key);
      newlyUnlocked.push(tier);
    }
  }

  await admin.from("achievement_progress").upsert({
    user_id: userId,
    achievement_id: def.id,
    current_value: value,
    updated_at: new Date().toISOString(),
  });

  return newlyUnlocked;
}

async function fetchReferralCounts(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<{ sends: number; conversions: number }> {
  const [{ count: sends }, { count: conversions }] = await Promise.all([
    admin
      .from("membership_referral_sends")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", userId),
    admin
      .from("referral_conversions")
      .select("*", { count: "exact", head: true })
      .eq("referrer_user_id", userId),
  ]);
  return { sends: sends ?? 0, conversions: conversions ?? 0 };
}

async function syncReferralProTiers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  def: AchievementDefinition,
  counts: { sends: number; conversions: number },
  existing: Set<string>,
): Promise<AchievementTier[]> {
  const highest = highestReferralProTier(counts.sends, counts.conversions);
  if (!highest) return [];

  const newlyUnlocked: AchievementTier[] = [];
  for (const tier of tiersUpTo(highest)) {
    const key = `${def.id}:${tier}`;
    if (existing.has(key)) continue;

    const { error } = await admin.from("user_achievements").insert({
      user_id: userId,
      achievement_id: def.id,
      tier,
      progress_snapshot: {
        sends: counts.sends,
        conversions: counts.conversions,
        metric: def.metric,
      },
    });
    if (!error) {
      existing.add(key);
      newlyUnlocked.push(tier);
    }
  }

  await admin.from("achievement_progress").upsert({
    user_id: userId,
    achievement_id: def.id,
    current_value: counts.sends,
    updated_at: new Date().toISOString(),
  });

  return newlyUnlocked;
}

/** Berechnet Metriken, schreibt neue Badge-Stufen und liefert Anzeige-Daten. */
export async function evaluateUserBadges(userId: string): Promise<UserAchievementRow[]> {
  const admin = createSupabaseAdminClient();

  const { data: defs, error: defsErr } = await admin
    .from("achievement_definitions")
    .select(
      "id,slug,name,category,description,icon_key,metric,bronze_threshold,silver_threshold,gold_threshold,platinum_threshold,sort_order",
    )
    .order("sort_order", { ascending: true });
  if (defsErr) {
    if (/achievement_definitions|does not exist/i.test(defsErr.message)) return [];
    throw new Error(defsErr.message);
  }

  const { data: unlockedRows } = await admin
    .from("user_achievements")
    .select("achievement_id,tier,unlocked_at")
    .eq("user_id", userId);

  const existing = new Set(
    (unlockedRows ?? []).map((r) => `${r.achievement_id}:${r.tier}`),
  );
  const unlockedByAchievement = new Map<string, { tier: AchievementTier; unlockedAt: string }>();
  for (const row of unlockedRows ?? []) {
    const tier = row.tier as AchievementTier;
    const prev = unlockedByAchievement.get(row.achievement_id);
    if (
      !prev ||
      ACHIEVEMENT_TIER_ORDER.indexOf(tier) > ACHIEVEMENT_TIER_ORDER.indexOf(prev.tier)
    ) {
      unlockedByAchievement.set(row.achievement_id, {
        tier,
        unlockedAt: row.unlocked_at,
      });
    }
  }

  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const linkUrl = base ? `${base}/punkte` : "/punkte";

  const display: UserAchievementRow[] = [];

  for (const def of (defs ?? []) as AchievementDefinition[]) {
    if (def.slug === "referral_pro") {
      const counts = await fetchReferralCounts(admin, userId);
      const newly = await syncReferralProTiers(admin, userId, def, counts, existing);

      for (const tier of newly) {
        try {
          await createUserNotification({
            userId,
            kind: NOTIFICATION_KINDS.badgeUnlocked,
            title: "Neues Erfolgs-Badge",
            body: `${def.name} — ${tierLabel(tier)} freigeschaltet.`,
            linkUrl,
            linkLabel: "Meine Anni-Stars",
            metadata: { achievement_slug: def.slug, tier },
          });
        } catch {
          /* ignore notification errors */
        }
      }

      const highest = highestReferralProTier(counts.sends, counts.conversions);
      if (!highest) continue;

      const prev = unlockedByAchievement.get(def.id);
      const unlocked = {
        tier: highest,
        unlockedAt:
          newly.length > 0
            ? new Date().toISOString()
            : (prev?.unlockedAt ?? new Date().toISOString()),
      };
      unlockedByAchievement.set(def.id, unlocked);

      display.push({
        achievementId: def.id,
        slug: def.slug,
        name: def.name,
        description: def.description,
        iconKey: def.icon_key,
        category: def.category,
        tier: unlocked.tier,
        unlockedAt: unlocked.unlockedAt,
        currentValue: counts.sends,
        nextTarget: null,
        nextTier: nextReferralProTier(unlocked.tier),
        progressDetail: formatReferralProgressDetail(
          counts.sends,
          counts.conversions,
          unlocked.tier,
        ),
      });
      continue;
    }

    const value = await metricValue(admin, userId, def.metric);
    const newly = await syncUnlockedTiers(admin, userId, def, value, existing);

    for (const tier of newly) {
      try {
        await createUserNotification({
          userId,
          kind: NOTIFICATION_KINDS.badgeUnlocked,
          title: "Neues Erfolgs-Badge",
          body: `${def.name} — ${tierLabel(tier)} freigeschaltet.`,
          linkUrl,
          linkLabel: "Meine Anni-Stars",
          metadata: { achievement_slug: def.slug, tier },
        });
      } catch {
        /* ignore notification errors */
      }
    }

    const highest = highestUnlockedTier(value, def);
    if (!highest) continue;

    const prev = unlockedByAchievement.get(def.id);
    const unlocked = {
      tier: highest,
      unlockedAt:
        newly.length > 0
          ? new Date().toISOString()
          : (prev?.unlockedAt ?? new Date().toISOString()),
    };
    unlockedByAchievement.set(def.id, unlocked);

    let nextTier: AchievementTier | null = null;
    let nextTarget: number | null = null;
    const tierIdx = ACHIEVEMENT_TIER_ORDER.indexOf(unlocked.tier);
    const next = ACHIEVEMENT_TIER_ORDER[tierIdx + 1];
    if (next) {
      nextTier = next;
      nextTarget =
        next === "silver"
          ? def.silver_threshold
          : next === "gold"
            ? def.gold_threshold
            : def.platinum_threshold;
    }

    display.push({
      achievementId: def.id,
      slug: def.slug,
      name: def.name,
      description: def.description,
      iconKey: def.icon_key,
      category: def.category,
      tier: unlocked.tier,
      unlockedAt: unlocked.unlockedAt,
      currentValue: value,
      nextTarget,
      nextTier,
    });
  }

  return display;
}

export async function loadUserAchievementsForDisplay(
  userId: string,
): Promise<UserAchievementRow[]> {
  const admin = createSupabaseAdminClient();

  const { data: defs, error: defsErr } = await admin
    .from("achievement_definitions")
    .select(
      "id,slug,name,category,description,icon_key,metric,bronze_threshold,silver_threshold,gold_threshold,platinum_threshold,sort_order",
    )
    .order("sort_order", { ascending: true });
  if (defsErr) {
    if (/achievement_definitions|does not exist/i.test(defsErr.message)) return [];
    throw new Error(defsErr.message);
  }

  const [{ data: unlockedRows }, { data: progressRows }] = await Promise.all([
    admin
      .from("user_achievements")
      .select("achievement_id,tier,unlocked_at")
      .eq("user_id", userId),
    admin
      .from("achievement_progress")
      .select("achievement_id,current_value")
      .eq("user_id", userId),
  ]);

  const progressMap = new Map(
    (progressRows ?? []).map((r) => [r.achievement_id, r.current_value as number]),
  );
  const bestByAchievement = new Map<string, { tier: AchievementTier; unlockedAt: string }>();
  for (const row of unlockedRows ?? []) {
    const tier = row.tier as AchievementTier;
    const prev = bestByAchievement.get(row.achievement_id);
    if (
      !prev ||
      ACHIEVEMENT_TIER_ORDER.indexOf(tier) > ACHIEVEMENT_TIER_ORDER.indexOf(prev.tier)
    ) {
      bestByAchievement.set(row.achievement_id, {
        tier,
        unlockedAt: row.unlocked_at,
      });
    }
  }

  const display: UserAchievementRow[] = [];
  for (const def of (defs ?? []) as AchievementDefinition[]) {
    const unlocked = bestByAchievement.get(def.id);
    if (!unlocked) continue;

    if (def.slug === "referral_pro") {
      const counts = await fetchReferralCounts(admin, userId);
      display.push({
        achievementId: def.id,
        slug: def.slug,
        name: def.name,
        description: def.description,
        iconKey: def.icon_key,
        category: def.category,
        tier: unlocked.tier,
        unlockedAt: unlocked.unlockedAt,
        currentValue: counts.sends,
        nextTarget: null,
        nextTier: nextReferralProTier(unlocked.tier),
        progressDetail: formatReferralProgressDetail(
          counts.sends,
          counts.conversions,
          unlocked.tier,
        ),
      });
      continue;
    }

    const value = progressMap.get(def.id) ?? 0;
    let nextTier: AchievementTier | null = null;
    let nextTarget: number | null = null;
    const tierIdx = ACHIEVEMENT_TIER_ORDER.indexOf(unlocked.tier);
    const next = ACHIEVEMENT_TIER_ORDER[tierIdx + 1];
    if (next) {
      nextTier = next;
      nextTarget =
        next === "silver"
          ? def.silver_threshold
          : next === "gold"
            ? def.gold_threshold
            : def.platinum_threshold;
    }

    display.push({
      achievementId: def.id,
      slug: def.slug,
      name: def.name,
      description: def.description,
      iconKey: def.icon_key,
      category: def.category,
      tier: unlocked.tier,
      unlockedAt: unlocked.unlockedAt,
      currentValue: value,
      nextTarget,
      nextTier,
    });
  }

  return display;
}
