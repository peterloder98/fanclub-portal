"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { applyPollVotePointsFx } from "@/lib/points/poll-vote-fx";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { PollVoteStats } from "@/components/polls/poll-vote-stats";
import { pollOptionButtonClass } from "@/components/polls/poll-option-styles";
import { PollOptionProgress, pollPercent } from "@/components/polls/poll-option-progress";
type PollRow = {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string;
};

type OptionRow = { id: string; poll_id: string; label: string; sort_order: number };
type VoteRow = { poll_id: string; option_id: string; user_id: string };
type Voter = { id: string; name: string; avatarUrl: string | null };

export function DashboardPollsInline() {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [myOptionIdsByPoll, setMyOptionIdsByPoll] = useState<Map<string, Set<string>>>(new Map());
  const [votersByOptionId, setVotersByOptionId] = useState<Record<string, Voter[]>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: pollRows } = await supabase
      .from("polls")
      .select("id,question,allow_multiple,ends_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);
    const rows = pollRows ?? [];
    setPolls(rows);
    if (!rows.length) return;

    const ids = rows.map((p) => p.id);
    const { data: optRows } = await supabase
      .from("poll_options")
      .select("id,poll_id,label,sort_order")
      .in("poll_id", ids)
      .order("sort_order", { ascending: true });
    setOptions(optRows ?? []);

    const { data: voteRows } = await supabase
      .from("poll_votes")
      .select("poll_id,option_id,user_id")
      .in("poll_id", ids);
    setVotes(voteRows ?? []);

    const mineByPoll = new Map<string, Set<string>>();
    (voteRows ?? [])
      .filter((v) => v.user_id === user.id)
      .forEach((v) => {
        if (!mineByPoll.has(v.poll_id)) mineByPoll.set(v.poll_id, new Set());
        mineByPoll.get(v.poll_id)!.add(v.option_id);
      });
    setMyOptionIdsByPoll(mineByPoll);

    const voterIds = Array.from(new Set((voteRows ?? []).map((v) => v.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", voterIds.length ? voterIds : ["00000000-0000-0000-0000-000000000000"]);
    const pMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          id: p.id,
          name:
            p.first_name && p.last_name
              ? `${p.first_name} ${p.last_name}`
              : (p.email ?? "Mitglied"),
          avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
        },
      ]),
    );
    const byOpt: Record<string, Voter[]> = {};
    (voteRows ?? []).forEach((v) => {
      const voter = pMap.get(v.user_id);
      if (!voter) return;
      (byOpt[v.option_id] ??= []).push(voter);
    });
    setVotersByOptionId(byOpt);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("dashboard-poll-votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const optionsByPoll = useMemo(() => {
    const m = new Map<string, OptionRow[]>();
    options.forEach((o) => {
      if (!m.has(o.poll_id)) m.set(o.poll_id, []);
      m.get(o.poll_id)!.push(o);
    });
    return m;
  }, [options]);

  async function toggleVote(poll: PollRow, optionId: string, fromEl: HTMLElement) {
    if (!userId) return;
    const ended = new Date(poll.ends_at).getTime() < Date.now();
    if (ended || busyKey) return;
    setBusyKey(`${poll.id}:${optionId}`);
    const supabase = createSupabaseBrowserClient();
    const mine = myOptionIdsByPoll.get(poll.id) ?? new Set<string>();
    const votesBefore = mine.size;
    const isSelected = mine.has(optionId);
    try {
      if (poll.allow_multiple) {
        if (isSelected) {
          await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", poll.id)
            .eq("user_id", userId)
            .eq("option_id", optionId);
        } else {
          await supabase.from("poll_votes").insert({
            poll_id: poll.id,
            user_id: userId,
            option_id: optionId,
          });
        }
      } else if (isSelected) {
        await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId);
      } else {
        await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId);
        await supabase.from("poll_votes").insert({
          poll_id: poll.id,
          user_id: userId,
          option_id: optionId,
        });
      }
      const { data: myRows } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", userId);
      const votesAfter = myRows?.length ?? 0;
      applyPollVotePointsFx({ votesBefore, votesAfter, fromEl });
      await load();
    } finally {
      setBusyKey(null);
    }
  }

  if (!polls.length) return null;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Umfragen</h3>
        <Link href="/polls" className="text-xs font-medium text-fc-blue hover:underline">
          alle Umfragen →
        </Link>
      </div>
      {polls.map((poll) => {
        const ended = new Date(poll.ends_at).getTime() < Date.now();
        const opts = optionsByPoll.get(poll.id) ?? [];
        const mine = myOptionIdsByPoll.get(poll.id) ?? new Set<string>();
        const hasVoted = mine.size > 0;
        const total = votes.filter((v) => v.poll_id === poll.id).length;
        const counts = new Map<string, number>();
        votes
          .filter((v) => v.poll_id === poll.id)
          .forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));

        return (
          <div key={poll.id} className="rounded-2xl border bg-white p-3 shadow-sm shadow-slate-900/5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">{poll.question}</div>
              {ended ? <Badge variant="neutral">Beendet</Badge> : <Badge variant="brand">Läuft</Badge>}
            </div>
            <div className="mt-2 grid gap-2">
              {opts.map((o) => {
                const c = counts.get(o.id) ?? 0;
                const { display: pct, bar: barPct } = pollPercent(c, total);
                const showResults = ended || hasVoted || total > 0;
                const voters = votersByOptionId[o.id] ?? [];
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={ended || busyKey === `${poll.id}:${o.id}`}
                    onClick={(e) => void toggleVote(poll, o.id, e.currentTarget)}
                    className={cn(
                      "group text-sm",
                      pollOptionButtonClass(mine.has(o.id), ended),
                    )}
                  >
                    {showResults ? <PollOptionProgress percent={barPct} /> : null}
                    <div className="relative z-10 flex justify-between gap-2 px-3 py-2">
                      <span className="font-medium text-slate-800">{o.label}</span>
                      {showResults ? (
                        <PollVoteStats count={c} percent={pct} voters={voters} />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <Link
              href={`/polls/${poll.id}`}
              className="mt-2 inline-block text-xs font-medium text-fc-blue hover:underline"
            >
              Kommentare →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
