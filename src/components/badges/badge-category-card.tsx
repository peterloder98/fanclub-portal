import { cn } from "@/lib/cn";
import {
  formatBadgeThreshold,
  isReferralBadge,
  thresholdForTier,
  type BADGE_CATALOG,
} from "@/lib/badges/guide";
import { formatReferralRequirementLines } from "@/lib/badges/referral-pro";
import { ACHIEVEMENT_TIER_ORDER, tierLabel } from "@/lib/badges/tiers";
import { tierChipClass, tierVisual } from "@/lib/badges/tier-styles";
import { AchievementBadgeIcon } from "@/components/badges/achievement-badge-icon";

type BadgeCategory = (typeof BADGE_CATALOG)[number];

function TierRequirementText({ category, tier }: { category: BadgeCategory; tier: typeof ACHIEVEMENT_TIER_ORDER[number] }) {
  if (isReferralBadge(category)) {
    const lines = formatReferralRequirementLines(tier);
    return (
      <div className="mt-2 space-y-0.5 text-center leading-tight">
        {lines.map((line) => (
          <p
            key={line}
            className={cn(
              "font-bold text-fc-navy",
              line.startsWith("+") ? "text-[10px] font-semibold text-slate-600" : "text-[11px] sm:text-xs",
            )}
          >
            {line}
          </p>
        ))}
      </div>
    );
  }

  const count = thresholdForTier(tier, category.thresholds);
  return (
    <p className="mt-2 text-center text-[11px] font-bold tabular-nums leading-tight text-fc-navy sm:text-xs">
      {formatBadgeThreshold(count, category.unit)}
    </p>
  );
}

export function BadgeCategoryCard({ category }: { category: BadgeCategory }) {
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm shadow-slate-900/5">
      <header className="mb-4 border-b border-slate-100 pb-3">
        <h4 className="text-base font-semibold text-fc-navy">{category.name}</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{category.description}</p>
      </header>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {ACHIEVEMENT_TIER_ORDER.map((tier) => (
          <div
            key={tier}
            className="flex min-w-0 flex-col items-center rounded-xl bg-white/80 px-1 py-2.5 ring-1 ring-slate-100 sm:px-2"
          >
            <AchievementBadgeIcon
              slug={category.slug}
              iconKey={category.iconKey}
              tier={tier}
              size={52}
              className="sm:scale-105"
            />
            <TierRequirementText category={category} tier={tier} />
            <span
              className={cn(
                "mt-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:px-2 sm:text-[10px]",
                tierChipClass(tier),
                tierVisual(tier).label,
              )}
            >
              {tierLabel(tier)}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
