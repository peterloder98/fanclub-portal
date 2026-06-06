export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export const ACHIEVEMENT_TIER_ORDER: AchievementTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
];

export function tierLabel(tier: AchievementTier): string {
  switch (tier) {
    case "bronze":
      return "Bronze";
    case "silver":
      return "Silber";
    case "gold":
      return "Gold";
    case "platinum":
      return "Platin";
  }
}

export function tierForValue(
  value: number,
  thresholds: {
    bronze_threshold: number;
    silver_threshold: number;
    gold_threshold: number;
    platinum_threshold: number;
  },
): AchievementTier | null {
  if (value >= thresholds.platinum_threshold) return "platinum";
  if (value >= thresholds.gold_threshold) return "gold";
  if (value >= thresholds.silver_threshold) return "silver";
  if (value >= thresholds.bronze_threshold) return "bronze";
  return null;
}

export function highestUnlockedTier(
  value: number,
  thresholds: {
    bronze_threshold: number;
    silver_threshold: number;
    gold_threshold: number;
    platinum_threshold: number;
  },
): AchievementTier | null {
  return tierForValue(value, thresholds);
}

export function nextTierTarget(
  value: number,
  thresholds: {
    bronze_threshold: number;
    silver_threshold: number;
    gold_threshold: number;
    platinum_threshold: number;
  },
): { tier: AchievementTier; target: number } | null {
  if (value < thresholds.bronze_threshold) {
    return { tier: "bronze", target: thresholds.bronze_threshold };
  }
  if (value < thresholds.silver_threshold) {
    return { tier: "silver", target: thresholds.silver_threshold };
  }
  if (value < thresholds.gold_threshold) {
    return { tier: "gold", target: thresholds.gold_threshold };
  }
  if (value < thresholds.platinum_threshold) {
    return { tier: "platinum", target: thresholds.platinum_threshold };
  }
  return null;
}
