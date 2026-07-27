"use client";

import Link from "next/link";
import { AchievementBadgeIcon } from "@/components/badges/achievement-badge-icon";
import { tierLabel } from "@/lib/badges/tiers";
import type { UserAchievementRow } from "@/lib/badges/evaluate-user-badges";
import { BADGE_CATALOG } from "@/lib/badges/guide";

/** Max. sichtbare Badges auf dem Portal (Katalog hat aktuell 6). */
const PORTAL_BADGE_SOFT_CAP = 8;

export function MemberPortalBadges({
  achievements,
}: {
  achievements: UserAchievementRow[];
}) {
  if (!achievements.length) return null;

  const shown = achievements.slice(0, PORTAL_BADGE_SOFT_CAP);
  const more = achievements.length - shown.length;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/70">
          Badges
        </h2>
        <Link href="/punkte" className="text-xs font-medium text-fc-blue hover:underline">
          Alle Erfolge
        </Link>
      </div>
      <ul className="flex flex-wrap gap-2">
        {shown.map((a) => (
          <li key={a.achievementId} className="group relative">
            <AchievementBadgeIcon
              slug={a.slug}
              iconKey={a.iconKey}
              tier={a.tier}
              size={44}
              className="transition group-hover:scale-105"
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max max-w-[11rem] -translate-x-1/2 rounded-lg bg-fc-navy px-2 py-1 text-center text-[10px] font-medium leading-snug text-white shadow-lg group-hover:block group-focus-within:block">
              {a.name} · {tierLabel(a.tier)}
            </span>
          </li>
        ))}
        {more > 0 ? (
          <li>
            <Link
              href="/punkte"
              className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-fc-navy/30 text-xs font-semibold text-fc-navy hover:bg-fc-ice"
              title={`${more} weitere`}
            >
              +{more}
            </Link>
          </li>
        ) : null}
      </ul>
      <p className="text-[11px] text-slate-500">
        Bis zu {BADGE_CATALOG.length} Badge-Arten — hier nur freigeschaltete als Icons.
      </p>
    </section>
  );
}
