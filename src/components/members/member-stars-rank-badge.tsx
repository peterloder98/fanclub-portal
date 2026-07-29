import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { AnniStarCount } from "@/components/anni-stars/anni-star-count";
import { AchievementBadgeIcon } from "@/components/badges/achievement-badge-icon";
import { tierLabel } from "@/lib/badges/tiers";
import type { UserAchievementRow } from "@/lib/badges/evaluate-user-badges";

const PORTAL_BADGE_SOFT_CAP = 8;

type MemberStarsRankBadgeProps = {
  yearPoints: number;
  yearRank: string;
  achievements?: UserAchievementRow[];
  variant?: "light" | "dark" | "card";
  className?: string;
  showLink?: boolean;
};

export function MemberStarsRankBadge({
  yearPoints,
  yearRank,
  achievements = [],
  variant = "card",
  className,
  showLink = false,
}: MemberStarsRankBadgeProps) {
  const shownBadges = achievements.slice(0, PORTAL_BADGE_SOFT_CAP);
  const moreBadges = achievements.length - shownBadges.length;

  const inner = (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center",
        variant === "card" &&
          "rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-rose-50/60 px-4 py-3 shadow-sm",
        variant === "light" &&
          "rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm sm:rounded-full sm:px-3 sm:py-1.5",
        variant === "dark" && "rounded-xl bg-fc-navy/5 px-3 py-2",
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <AnniStarCount value={yearPoints} size={variant === "light" ? "sm" : "md"} />
          <span
            className={cn(
              "text-xs font-medium",
              variant === "light" ? "text-white/90" : "text-slate-600",
            )}
          >
            Anni-Stars
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
            variant === "light" ? "bg-white/20 text-white" : "bg-fc-navy text-white shadow-sm",
          )}
        >
          <Star className="h-3 w-3 fill-current" aria-hidden />
          {yearRank}
        </span>
      </div>

      {shownBadges.length ? (
        <ul className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          {shownBadges.map((a) => (
            <li key={a.achievementId} className="group relative shrink-0">
              <AchievementBadgeIcon
                slug={a.slug}
                iconKey={a.iconKey}
                tier={a.tier}
                size={variant === "light" ? 36 : 40}
                className="transition group-hover:scale-105"
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max max-w-[11rem] -translate-x-1/2 rounded-lg bg-fc-navy px-2 py-1 text-center text-[10px] font-medium leading-snug text-white shadow-lg group-hover:block group-focus-within:block">
                {a.name} · {tierLabel(a.tier)}
              </span>
            </li>
          ))}
          {moreBadges > 0 ? (
            <li className="shrink-0">
              <span
                className={cn(
                  "grid place-items-center rounded-full border border-dashed text-xs font-semibold",
                  variant === "light"
                    ? "h-9 w-9 border-white/40 text-white"
                    : "h-10 w-10 border-fc-navy/30 text-fc-navy",
                )}
                title={`${moreBadges} weitere`}
              >
                +{moreBadges}
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );

  if (showLink) {
    return (
      <Link href="/punkte" className="block min-w-0 transition hover:opacity-95">
        {inner}
      </Link>
    );
  }

  return inner;
}
