export const FEATURE_FLAGS = {
  /** Shop — vorerst für alle ausgeblendet. */
  merchandise: false,
  /** Radio-Votings — vorerst für alle ausgeblendet. */
  votings: false,
} as const;

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
