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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
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
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,360px)] lg:items-stretch">
          {mapSection}
          {birthdaysSection}
        </section>
      ) : null}

      {tab === "treffen" ? <MeetingsUpcomingSection meetings={meetings} /> : null}
      {tab === "archiv" ? (
        <MeetingsArchiveSection meetings={meetings} mediaByMeetingId={mediaByMeetingId} />
      ) : null}
    </div>
  );
}
