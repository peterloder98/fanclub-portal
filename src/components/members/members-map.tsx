"use client";

import dynamic from "next/dynamic";
import type { MemberMapCluster } from "@/lib/members/cluster-map";

const MembersMapClient = dynamic(
  () => import("./members-map.client").then((m) => m.MembersMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-[280px] place-items-center rounded-xl border border-fc-ice bg-slate-50 text-sm text-slate-500">
        Karte wird geladen …
      </div>
    ),
  },
);

export function MembersMap({
  clusters,
  memberCount,
  totalActive,
}: {
  clusters: MemberMapCluster[];
  memberCount: number;
  totalActive?: number;
}) {
  return (
    <MembersMapClient
      clusters={clusters}
      memberCount={memberCount}
      totalActive={totalActive}
    />
  );
}
