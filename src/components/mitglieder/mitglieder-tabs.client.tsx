"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { MeetingsArchiveSection, MeetingsUpcomingSection } from "@/components/meetings/meetings-section";
import type { ClubMeetingListItem } from "@/lib/meetings/types";

type Tab = "karte" | "treffen" | "archiv";

export function MitgliederTabs({
  mapSection,
  birthdaysSection,
  meetings,
  mediaByMeetingId,
}: {
  mapSection: React.ReactNode;
  birthdaysSection: React.ReactNode;
  meetings: ClubMeetingListItem[];
  mediaByMeetingId: Record<
    string,
    Array<{ id: string; kind: string; caption: string | null; report_body: string | null }>
  >;
}) {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("tab") as Tab) || "karte";
  const [tab, setTab] = useState<Tab>(
    ["karte", "treffen", "archiv"].includes(initial) ? initial : "karte",
  );

  const tabs = useMemo(
    () =>
      [
        ["karte", "Mitglieder-Karte"],
        ["treffen", "Fanclub Treffen"],
        ["archiv", "Treffen-Archiv"],
      ] as const,
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-medium transition",
              tab === key
                ? "border-fc-navy bg-fc-navy text-white shadow-sm"
                : "border-fc-ice bg-white text-fc-navy hover:bg-fc-ice",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "karte" ? (
        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(240px,320px)] lg:gap-4 lg:items-stretch">
          <div className="min-h-0 flex-[1.35] lg:h-full lg:flex-none">{mapSection}</div>
          <div className="min-h-[11rem] max-h-[42%] min-w-0 lg:max-h-none lg:h-full lg:min-h-0">
            {birthdaysSection}
          </div>
        </section>
      ) : null}

      {tab === "treffen" ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(var(--fanclub-chat-dock,0px)+var(--fanclub-mobile-tab-bar,0px))]">
          <MeetingsUpcomingSection meetings={meetings} />
        </div>
      ) : null}
      {tab === "archiv" ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(var(--fanclub-chat-dock,0px)+var(--fanclub-mobile-tab-bar,0px))]">
          <MeetingsArchiveSection meetings={meetings} mediaByMeetingId={mediaByMeetingId} />
        </div>
      ) : null}
    </div>
  );
}
