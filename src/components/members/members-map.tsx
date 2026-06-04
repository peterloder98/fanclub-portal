"use client";

import dynamic from "next/dynamic";
import type { MemberMapPlacement } from "@/lib/members/spread-member-map";

const MembersMapClient = dynamic(
  () => import("./members-map.client").then((m) => m.MembersMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[360px] place-items-center rounded-xl border bg-slate-50 text-sm text-slate-500">
        Karte wird geladen …
      </div>
    ),
  },
);

export function MembersMap({
  placements,
  memberCount,
}: {
  placements: MemberMapPlacement[];
  memberCount: number;
}) {
  return <MembersMapClient placements={placements} memberCount={memberCount} />;
}
