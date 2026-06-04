"use client";

import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { POINTS_YEAR_END_NOTE } from "@/lib/points/values";

export function YearEndLotteryCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50 via-white to-rose-50/80 shadow-sm shadow-amber-900/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-sm">
          <Trophy className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="min-w-0 flex-1 text-lg font-bold text-slate-900">Jahres-Sonderverlosung</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-slate-600 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-amber-200/80 px-5 pb-5 pt-3">
          <p className="text-sm leading-relaxed text-slate-700">{POINTS_YEAR_END_NOTE}</p>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            Genau zehn Mitglieder mit den meisten Statuspunkten im abgelaufenen Jahr nehmen automatisch
            teil — bei Punktgleichstand nach festen Regeln, nicht per Zufall.
          </p>
        </div>
      ) : null}
    </div>
  );
}
