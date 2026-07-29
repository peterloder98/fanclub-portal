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
  const starTone = variant === "light" ? "onDark" : "emphasis";

  const inner = (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between",
        variant === "card" &&
          "rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-rose-50/70 px-4 py-3.5 shadow-sm shadow-amber-900/5",
        variant === "light" &&
          "rounded-2xl border border-white/25 bg-white/10 px-3.5 py-3 backdrop-blur-sm",
        variant === "dark" && "rounded-xl bg-fc-navy/5 px-3 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 shrink-0 flex-col justify-center gap-2">
        <div
          className={cn(
            "inline-flex w-fit items-center gap-3 rounded-xl px-3 py-2",
            variant === "card" && "bg-white/95 shadow-sm ring-1 ring-amber-200/70",
            variant === "light" && "bg-white/15 ring-1 ring-white/25",
            variant === "dark" && "bg-white ring-1 ring-slate-200/80",
          )}
        >
          <AnniStarCount value={yearPoints} size="md" tone={starTone} />
          <div className="min-w-0">
            <p
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                variant === "light" ? "text-white/85" : "text-amber-900/70",
              )}
            >
              Anni-Stars
            </p>
            <span
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                variant === "light"
                  ? "bg-white/20 text-white"
                  : "bg-fc-navy text-white shadow-sm",
              )}
            >
              <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
              {yearRank}
            </span>
          </div>
        </div>
      </div>

      {shownBadges.length ? (
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col justify-center sm:items-end",
            variant === "card" && "sm:border-l sm:border-amber-200/70 sm:pl-4",
            variant === "light" && "sm:border-l sm:border-white/20 sm:pl-4",
            variant === "dark" && "sm:border-l sm:border-slate-200 sm:pl-4",
          )}
        >
          <p
            className={cn(
              "mb-1.5 hidden text-[10px] font-semibold uppercase tracking-wide sm:block sm:text-right",
              variant === "light" ? "text-white/75" : "text-slate-500",
            )}
          >
            Badges
          </p>
          <ul className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {shownBadges.map((a) => (
              <li key={a.achievementId} className="group relative shrink-0">
                <AchievementBadgeIcon
                  slug={a.slug}
                  iconKey={a.iconKey}
                  tier={a.tier}
                  size={variant === "light" ? 38 : 42}
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
                    "grid h-10 w-10 place-items-center rounded-full border border-dashed text-xs font-semibold",
                    variant === "light"
                      ? "border-white/40 text-white"
                      : "border-fc-navy/25 text-fc-navy",
                  )}
                  title={`${moreBadges} weitere`}
                >
                  +{moreBadges}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
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
