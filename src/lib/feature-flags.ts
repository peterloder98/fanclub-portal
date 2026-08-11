/**
 * Feature-Flags: auf `true` setzen, um Shop bzw. Radio-Votings wieder freizuschalten.
 * Badges, Punkte-Regeln, Navigation und Vergabe reagieren automatisch.
 */
export const FEATURE_FLAGS = {
  /** Fanshop + Merch-Badge + Shop-Sterne */
  merchandise: false,
  /** Radio-Hörervotings (+ Badge „Votingheld“, Radio-Sterne, Nav/Admin) */
  votings: false,
  /** Reiseinformationen bei Events und Treffen (UI ausgeblendet bis Freigabe) */
  travelInfo: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

/** Badge-Slugs, die an Flags hängen. */
export const FEATURE_BADGE_SLUGS = {
  merch_legend: "merchandise",
  voting_hero: "votings",
} as const satisfies Record<string, FeatureFlag>;

/** Punkte-Regel-IDs, die an Flags hängen. */
export const FEATURE_POINTS_RULE_IDS = {
  radio_voting: "votings",
} as const satisfies Record<string, FeatureFlag>;

export function isBadgeSlugEnabled(slug: string): boolean {
  const flag = (FEATURE_BADGE_SLUGS as Record<string, FeatureFlag | undefined>)[slug];
  if (!flag) return true;
  return isFeatureEnabled(flag);
}

export function isPointsRuleEnabled(ruleId: string): boolean {
  const flag = (FEATURE_POINTS_RULE_IDS as Record<string, FeatureFlag | undefined>)[ruleId];
  if (!flag) return true;
  return isFeatureEnabled(flag);
}
