import {
  ACHIEVEMENT_TIER_ORDER,
  type AchievementTier,
  tierLabel,
} from "@/lib/badges/tiers";

export type ReferralProRequirement = {
  sends: number;
  conversions: number;
};

/** Einladungen + freigeschaltete Neumitglieder — gemeinsame Quelle für UI & Engine. */
export const REFERRAL_PRO_REQUIREMENTS: Record<AchievementTier, ReferralProRequirement> = {
  bronze: { sends: 5, conversions: 0 },
  silver: { sends: 10, conversions: 0 },
  gold: { sends: 15, conversions: 1 },
  platinum: { sends: 20, conversions: 2 },
};

export const REFERRAL_PRO_DESCRIPTION =
  "Versendete Einladungs-E-Mails über „Neues Mitglied werben“. Ab Gold zusätzlich freigeschaltete Neumitglieder (Antrag eingereicht und vom Vorstand bestätigt).";

export function referralProTierMet(
  sends: number,
  conversions: number,
  tier: AchievementTier,
): boolean {
  const req = REFERRAL_PRO_REQUIREMENTS[tier];
  return sends >= req.sends && conversions >= req.conversions;
}

export function highestReferralProTier(
  sends: number,
  conversions: number,
): AchievementTier | null {
  let highest: AchievementTier | null = null;
  for (const tier of ACHIEVEMENT_TIER_ORDER) {
    if (referralProTierMet(sends, conversions, tier)) highest = tier;
  }
  return highest;
}

export function nextReferralProTier(after: AchievementTier | null): AchievementTier | null {
  if (!after) return "bronze";
  const idx = ACHIEVEMENT_TIER_ORDER.indexOf(after);
  return ACHIEVEMENT_TIER_ORDER[idx + 1] ?? null;
}

export function formatReferralRequirementLines(tier: AchievementTier): string[] {
  const req = REFERRAL_PRO_REQUIREMENTS[tier];
  const lines = [`${req.sends} Einladungen`];
  if (req.conversions > 0) {
    lines.push(
      `+ ${req.conversions} ${req.conversions === 1 ? "Neumitglied" : "Neumitglieder"}`,
    );
  }
  return lines;
}

export function formatReferralProgressDetail(
  sends: number,
  conversions: number,
  currentTier: AchievementTier,
): string {
  const next = nextReferralProTier(currentTier);
  if (!next) return "Höchste Stufe erreicht";

  const req = REFERRAL_PRO_REQUIREMENTS[next];
  const parts: string[] = [];

  if (sends < req.sends) {
    parts.push(`${sends}/${req.sends} Einladungen`);
  }
  if (req.conversions > 0 && conversions < req.conversions) {
    parts.push(
      `${conversions}/${req.conversions} ${req.conversions === 1 ? "Neumitglied" : "Neumitglieder"}`,
    );
  }
  if (!parts.length) {
    return `Bereit für ${tierLabel(next)}`;
  }
  return `${parts.join(" · ")} bis ${tierLabel(next)}`;
}
