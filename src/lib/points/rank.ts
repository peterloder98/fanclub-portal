import { POINTS_RANKS } from "@/lib/points/values";

export function rankFromPoints(points: number): (typeof POINTS_RANKS)[number]["label"] {
  let rank: (typeof POINTS_RANKS)[number]["label"] = POINTS_RANKS[0].label;
  for (const tier of POINTS_RANKS) {
    if (points >= tier.from) rank = tier.label;
  }
  return rank;
}
