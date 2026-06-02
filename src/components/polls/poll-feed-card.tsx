"use client";

import Link from "next/link";
import { PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type PollFeedData = {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string;
  created_at: string;
  lastActivityAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAtLabel: string;
};

type OptionRow = { id: string; poll_id: string; label: string; sort_order: number };
type VoteRow = { poll_id: string; option_id: string; user_id: string; created_at?: string };
type Voter = { id: string; name: string };

export function PollFeedCard({
  poll,
  options,
  votes,
  myOptionIds,
  votersByOptionId,
  busyKey,
  onToggleVote,
  onEnsureVoters,
}: {
  poll: PollFeedData;
  options: OptionRow[];
  votes: VoteRow[];
  myOptionIds: Set<string>;
  votersByOptionId: Record<string, Voter[]>;
  busyKey: string | null;
  onToggleVote: (optionId: string, fromEl: HTMLElement) => void;
  onEnsureVoters: (optionId: string) => void;
}) {
  const ended = new Date(poll.ends_at).getTime() < Date.now();
  const hasVoted = myOptionIds.size > 0;
  const total = votes.filter((v) => v.poll_id === poll.id).length;
  const counts = new Map<string, number>();
  votes
    .filter((v) => v.poll_id === poll.id)
    .forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));

  const opts = options.filter((o) => o.poll_id === poll.id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="h-7 w-7 overflow-hidden rounded-full border bg-slate-50">
                {poll.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poll.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-slate-600">
                    {poll.authorName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join("")}
                  </div>
                )}
              </div>
              <span className="font-medium text-slate-800">{poll.authorName}</span>
              <span>·</span>
              <span>{poll.createdAtLabel}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-600" />
              <span className="text-base font-semibold text-slate-900">{poll.question}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {ended ? <Badge variant="neutral">Beendet</Badge> : <Badge variant="brand">Umfrage</Badge>}
            {poll.allow_multiple ? <Badge variant="neutral">Mehrfach</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5 pb-4">
        {opts.map((o) => {
          const c = counts.get(o.id) ?? 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          const showResults = ended || hasVoted;
          const voters = votersByOptionId[o.id] ?? [];
          return (
            <button
              key={o.id}
              type="button"
              disabled={ended || busyKey === `${poll.id}:${o.id}`}
              onClick={(e) => onToggleVote(o.id, e.currentTarget)}
              className={cn(
                "relative w-full overflow-visible rounded-xl border text-left transition",
                myOptionIds.has(o.id) ? "border-blue-400 bg-blue-50" : "bg-white hover:bg-slate-50",
                ended && "cursor-default opacity-90",
              )}
            >
              {showResults ? (
                <div
                  className="absolute inset-y-0 left-0 rounded-xl bg-blue-50/90 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              ) : null}
              <div className="relative flex min-h-[48px] items-center gap-3 px-3 py-3 text-sm">
                <span className="min-w-0 flex-1 font-medium text-slate-800">{o.label}</span>
                {showResults ? (
                  <span
                    className="group/stats relative shrink-0 rounded-lg px-2 py-1 text-slate-600 tabular-nums hover:bg-white/80"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      onEnsureVoters(o.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c} ({pct}%)
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] hidden w-56 -translate-y-1/2 rounded-xl border bg-white p-3 text-xs text-slate-700 shadow-lg shadow-slate-900/15 group-hover/stats:block"
                    >
                      <span className="font-semibold text-slate-900">Wer hat gestimmt?</span>
                      <span className="mt-2 block max-h-40 overflow-y-auto">
                        {voters.length
                          ? voters.slice(0, 12).map((u) => (
                              <span key={u.id} className="block truncate py-0.5">
                                {u.name}
                              </span>
                            ))
                          : "Noch keine Stimmen"}
                        {voters.length > 12 ? (
                          <span className="mt-1 block text-slate-500">
                            +{voters.length - 12} weitere…
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
        <Link
          href={`/polls/${poll.id}`}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Kommentare →
        </Link>
      </CardContent>
    </Card>
  );
}

export type { OptionRow, VoteRow, Voter };
