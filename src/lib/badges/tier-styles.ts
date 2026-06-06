import type { AchievementTier } from "@/lib/badges/tiers";

export type TierVisual = {
  chip: string;
  label: string;
  fillFrom: string;
  fillVia: string;
  fillTo: string;
  rim: string;
  ribbon: string;
  icon: string;
};

export const TIER_VISUALS: Record<AchievementTier, TierVisual> = {
  bronze: {
    chip: "bg-[#fdf0e0] text-[#7c4a1a] ring-1 ring-[#c47a2c]",
    label: "text-[#7c4a1a]",
    fillFrom: "#e8a55c",
    fillVia: "#c47a2c",
    fillTo: "#8b4513",
    rim: "#6b3410",
    ribbon: "#a0521f",
    icon: "#fff8ef",
  },
  silver: {
    chip: "bg-[#f0f1f3] text-[#4a5568] ring-1 ring-[#a8adb8]",
    label: "text-[#4a5568]",
    fillFrom: "#eef0f3",
    fillVia: "#c5c9d1",
    fillTo: "#8e95a3",
    rim: "#6b7280",
    ribbon: "#9ca3af",
    icon: "#ffffff",
  },
  gold: {
    chip: "bg-[#fff9e6] text-[#8a6b00] ring-1 ring-[#d4af37]",
    label: "text-[#8a6b00]",
    fillFrom: "#ffe566",
    fillVia: "#e6b800",
    fillTo: "#b8860b",
    rim: "#8a6b00",
    ribbon: "#c9a227",
    icon: "#fffef5",
  },
  platinum: {
    chip: "bg-[#e8f4fc] text-[#2c5282] ring-1 ring-[#7eb8d8]",
    label: "text-[#2c5282]",
    fillFrom: "#e8f6ff",
    fillVia: "#9ecae8",
    fillTo: "#4a90b8",
    rim: "#2c5282",
    ribbon: "#5b9cbd",
    icon: "#f8fdff",
  },
};

export function tierVisual(tier: AchievementTier): TierVisual {
  return TIER_VISUALS[tier];
}

export function tierChipClass(tier: AchievementTier): string {
  return TIER_VISUALS[tier].chip;
}
