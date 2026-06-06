"use client";

import { useState } from "react";
import { Award, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { BADGE_CATALOG, BADGE_TIER_EXPLANATION } from "@/lib/badges/guide";
import { tierLabel } from "@/lib/badges/tiers";
import { tierChipClass, tierVisual } from "@/lib/badges/tier-styles";
import { BadgeCategoryCard } from "@/components/badges/badge-category-card";

export function BadgesGuideCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      id="erfolge"
      className="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-sky text-white shadow-sm">
            <Award className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fc-navy">Erfolge & Badges</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Zusätzlich zu Anni-Stars — sichtbar unter „Meine Erfolge“.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-600">
          Badges belohnen langfristige Aktivität im Fanclub — unabhängig vom jährlichen
          Anni-Stars-Stand. Jede Kategorie hat vier Stufen in Bronze, Silber, Gold und Platin.
        </p>

        <div>
          <h3 className="text-sm font-semibold text-fc-navy">Stufen</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {BADGE_TIER_EXPLANATION.map((e) => (
              <li
                key={e.tier}
                className={cn("rounded-xl px-3 py-2.5 text-sm", tierChipClass(e.tier))}
              >
                <span className={cn("font-semibold", tierVisual(e.tier).label)}>
                  {tierLabel(e.tier)}
                </span>
                <span className="text-slate-700"> — {e.summary}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm font-semibold text-fc-navy transition hover:bg-slate-100/80"
        >
          <span>
            {expanded ? "Weniger anzeigen" : "Alle Abzeichen & Kategorien anzeigen"}
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {expanded ? (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-600">
              Unter jedem Abzeichen steht, was du brauchst. Beim Werbeprofi zählen versendete
              Einladungen; ab Gold zusätzlich freigeschaltete Neumitglieder.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              {BADGE_CATALOG.map((category) => (
                <BadgeCategoryCard key={category.slug} category={category} />
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Beim Besuch der Anni-Stars-Seite werden neue Stufen automatisch erkannt; du
              erhältst eine Benachrichtigung.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
