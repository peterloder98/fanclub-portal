import type { AchievementTier } from "@/lib/badges/tiers";
import { tierLabel } from "@/lib/badges/tiers";
import {
  REFERRAL_PRO_DESCRIPTION,
  REFERRAL_PRO_REQUIREMENTS,
} from "@/lib/badges/referral-pro";

export type BadgeThresholdUnit = {
  singular: string;
  plural: string;
};

export const BADGE_TIER_EXPLANATION = [
  {
    tier: "bronze" as const,
    summary: "Erste Schritte — du bist aktiv im Fanclub.",
  },
  {
    tier: "silver" as const,
    summary: "Regelmäßig dabei — du kennst dich aus.",
  },
  {
    tier: "gold" as const,
    summary: "Starker Einsatz — du bist eine echte Stütze.",
  },
  {
    tier: "platinum" as const,
    summary: "Höchste Stufe — Fanclub-Legende in dieser Kategorie.",
  },
];

/** Entspricht dem Seed in supabase/070_anni_stars_system.sql */
export const BADGE_CATALOG = [
  {
    slug: "concert_pro",
    name: "Konzertprofi",
    iconKey: "music",
    description: "Bestätigte Event-Teilnahmen über „Ich bin dabei“.",
    unit: { singular: "Teilnahme", plural: "Teilnahmen" },
    thresholds: { bronze: 3, silver: 10, gold: 25, platinum: 50 },
  },
  {
    slug: "voting_hero",
    name: "Votingheld",
    iconKey: "vote",
    description: "Radio-Hörervotings und Umfragen in der App.",
    unit: { singular: "Teilnahme", plural: "Teilnahmen" },
    thresholds: { bronze: 5, silver: 10, gold: 25, platinum: 50 },
  },
  {
    slug: "birthday_greeter",
    name: "Geburtstagsgratulant",
    iconKey: "cake",
    description: "Gratulationen unter Geburtstags-Beiträgen im Feed.",
    unit: { singular: "Gratulation", plural: "Gratulationen" },
    thresholds: { bronze: 3, silver: 10, gold: 25, platinum: 50 },
  },
  {
    slug: "club_veteran",
    name: "Fanclub-Urgestein",
    iconKey: "shield",
    description: "Dauer der aktiven Mitgliedschaft im Fanclub.",
    unit: { singular: "Jahr", plural: "Jahre" },
    thresholds: { bronze: 1, silver: 2, gold: 5, platinum: 10 },
  },
  {
    slug: "merch_legend",
    name: "Merch-Legende",
    iconKey: "shirt",
    description: "Gekaufte Artikel im Fanshop (versendet, nicht storniert).",
    unit: { singular: "Artikel", plural: "Artikel" },
    thresholds: { bronze: 5, silver: 15, gold: 25, platinum: 50 },
  },
  {
    slug: "referral_pro",
    name: "Werbeprofi",
    iconKey: "users",
    description: REFERRAL_PRO_DESCRIPTION,
    kind: "referral",
    thresholds: REFERRAL_PRO_REQUIREMENTS,
  },
] as const;

export type BadgeCategoryEntry = (typeof BADGE_CATALOG)[number];

export type ReferralBadgeCategory = Extract<BadgeCategoryEntry, { slug: "referral_pro" }>;

export type CountBadgeCategory = Exclude<BadgeCategoryEntry, ReferralBadgeCategory>;

export function isReferralBadge(
  category: BadgeCategoryEntry,
): category is ReferralBadgeCategory {
  return category.slug === "referral_pro";
}

export function thresholdForTier(
  tier: AchievementTier,
  thresholds: CountBadgeCategory["thresholds"],
): number {
  return thresholds[tier];
}

export function formatBadgeThreshold(
  count: number,
  unit: BadgeThresholdUnit,
): string {
  const word = count === 1 ? unit.singular : unit.plural;
  return `${count} ${word}`;
}

export function formatThresholdLine(t: (typeof BADGE_CATALOG)[number]["thresholds"]) {
  return `Bronze ab ${t.bronze} · Silber ab ${t.silver} · Gold ab ${t.gold} · Platin ab ${t.platinum}`;
}

export function badgeTierLabels() {
  return BADGE_TIER_EXPLANATION.map((e) => ({
    label: tierLabel(e.tier),
    summary: e.summary,
  }));
}
