"use client";

import { cn } from "@/lib/cn";

export const DASHBOARD_FEED_FILTERS = [
  { id: "all", label: "Alles" },
  { id: "posts", label: "Beiträge" },
  { id: "polls", label: "Umfragen" },
  { id: "giveaways", label: "Gewinnspiele" },
  { id: "birthdays", label: "Geburtstage" },
] as const;

export type DashboardFeedFilterId = (typeof DASHBOARD_FEED_FILTERS)[number]["id"];

export function DashboardFeedFilterChips({
  value,
  onChange,
}: {
  value: DashboardFeedFilterId;
  onChange: (id: DashboardFeedFilterId) => void;
}) {
  return (
    <div
      className="mb-3 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Feed filtern"
    >
      {DASHBOARD_FEED_FILTERS.map((filter) => {
        const active = value === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-fc-navy text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:border-fc-sky/40 hover:bg-fc-ice/50",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
