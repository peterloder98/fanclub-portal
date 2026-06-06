import { cn } from "@/lib/cn";
import { tierLabel, type AchievementTier } from "@/lib/badges/tiers";
import { tierChipClass } from "@/lib/badges/tier-styles";
import type { UserAchievementRow } from "@/lib/badges/evaluate-user-badges";
import { AchievementBadgeIcon } from "@/components/badges/achievement-badge-icon";

export function AchievementsPanel({
  achievements,
  compact = false,
}: {
  achievements: UserAchievementRow[];
  compact?: boolean;
}) {
  if (!achievements.length) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5",
          compact && "rounded-xl",
        )}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-base font-semibold text-fc-navy">Meine Erfolge</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Aktiv in der App — Konzerte, Umfragen, Shop und mehr — um Badges zu sammeln.
          </p>
        </div>
        <p className="px-4 py-4 text-sm text-slate-600">
          Noch keine Badges freigeschaltet.{" "}
          <a href="#erfolge" className="font-medium text-fc-blue hover:underline">
            So funktionieren Erfolge →
          </a>
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5",
        compact && "rounded-xl",
      )}
    >
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-base font-semibold text-fc-navy">Meine Erfolge</h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Badges für Aktivität im Fanclub — Bronze bis Platin.
        </p>
      </div>
      <ul className={cn("grid gap-2 px-3 py-3", !compact && "sm:grid-cols-2")}>
        {achievements.map((a) => (
          <li
            key={a.achievementId}
            className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
          >
            <AchievementBadgeIcon
              slug={a.slug}
              iconKey={a.iconKey}
              tier={a.tier}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-fc-navy">{a.name}</span>
                <TierChip tier={a.tier} />
              </div>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">{a.description}</p>
              {a.progressDetail ? (
                <p className="mt-1 text-[11px] text-slate-500">{a.progressDetail}</p>
              ) : a.nextTier && a.nextTarget != null ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  {a.currentValue} / {a.nextTarget} bis {tierLabel(a.nextTier)}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">Höchste Stufe erreicht</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TierChip({ tier }: { tier: AchievementTier }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tierChipClass(tier),
      )}
    >
      {tierLabel(tier)}
    </span>
  );
}
