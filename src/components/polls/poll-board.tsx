"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { applyPollVotePointsFx } from "@/lib/points/poll-vote-fx";
import { profileToUserListEntry } from "@/lib/profiles/display";
import { PollEndCountdown } from "@/components/polls/poll-end-countdown";
import { PollVoteStats } from "@/components/polls/poll-vote-stats";

type PollRow = {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string;
  created_at: string;
};

type OptionRow = { id: string; poll_id: string; label: string; sort_order: number };
type VoteRow = { poll_id: string; option_id: string; user_id: string };
type Voter = { id: string; name: string; avatarUrl: string | null };

export function PollBoard({
  initialPolls = [],
  activeOnly = false,
}: {
  initialPolls?: PollRow[];
  activeOnly?: boolean;
}) {
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get("refresh");
  const [polls, setPolls] = useState<PollRow[]>(initialPolls);
  const [loading, setLoading] = useState(!initialPolls.length);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [myOptionIdsByPoll, setMyOptionIdsByPoll] = useState<Map<string, Set<string>>>(
    new Map(),
  );
  const [votersByOptionId, setVotersByOptionId] = useState<Record<string, Voter[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const optionsByPoll = useMemo(() => {
    const m = new Map<string, OptionRow[]>();
    options.forEach((o) => {
      if (!m.has(o.poll_id)) m.set(o.poll_id, []);
      m.get(o.poll_id)!.push(o);
    });
    m.forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return m;
  }, [options]);

  const voteCountByPoll = useMemo(() => {
    const m = new Map<string, number>();
    votes.forEach((v) => {
      m.set(v.poll_id, (m.get(v.poll_id) ?? 0) + 1);
    });
    return m;
  }, [votes]);

  useEffect(() => {
    if (initialPolls.length) {
      setPolls(initialPolls);
      setLoading(false);
    }
  }, [initialPolls]);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: pollRows, error: pollErr } = await supabase
      .from("polls")
      .select("id,question,allow_multiple,ends_at,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (pollErr) throw pollErr;
    const rows = pollRows ?? [];
    setPolls((prev) => {
      if (rows.length > 0) return rows;
      if (refreshToken) return rows;
      return prev.length ? prev : rows;
    });

    const pollIds = (pollRows ?? []).map((p) => p.id);
    if (!pollIds.length) {
      setOptions([]);
      setVotes([]);
      return;
    }

    const { data: optRows, error: optErr } = await supabase
      .from("poll_options")
      .select("id,poll_id,label,sort_order")
      .in("poll_id", pollIds)
      .order("sort_order", { ascending: true });
    if (optErr) throw optErr;
    setOptions(optRows ?? []);

    const { data: voteRows, error: voteErr } = await supabase
      .from("poll_votes")
      .select("poll_id,option_id,user_id")
      .in("poll_id", pollIds);
    if (voteErr) throw voteErr;
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
    const pMap = new Map<string, Voter>(
      (profiles ?? []).map((p) => [p.id, profileToUserListEntry(p)]),
    );

    const byOpt: Record<string, Voter[]> = {};
    (voteRows ?? []).forEach((v) => {
      const voter = pMap.get(v.user_id);
      if (!voter) return;
      (byOpt[v.option_id] ??= []).push(voter);
    });
    Object.values(byOpt).forEach((arr) => {
      arr.sort((a, b) => a.name.localeCompare(b.name, "de"));
    });
    setVotersByOptionId(byOpt);

    setLoading(false);
  }, [refreshToken]);

  useEffect(() => {
    void load().catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes("polls") || msg.includes("does not exist")
          ? "Umfragen-Tabelle fehlt. Bitte `supabase/010_polls.sql` in Supabase ausführen."
          : `Umfragen konnten nicht geladen werden: ${msg}`,
      );
    });
  }, [load, refreshToken]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("poll-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function toggleVote(poll: PollRow, optionId: string, fromEl: HTMLElement) {
    if (!userId) return;
    const ended = new Date(poll.ends_at).getTime() < Date.now();
    if (ended) return;
    const key = `${poll.id}:${optionId}`;
    if (busyKey) return;
    setBusyKey(key);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const mine = myOptionIdsByPoll.get(poll.id) ?? new Set<string>();
    const votesBefore = mine.size;
    const isSelected = mine.has(optionId);

    try {
      if (poll.allow_multiple) {
        if (isSelected) {
          const { error: delErr } = await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", poll.id)
            .eq("user_id", userId)
            .eq("option_id", optionId);
          if (delErr) throw delErr;
        } else {
          const { error: insErr } = await supabase.from("poll_votes").insert({
            poll_id: poll.id,
            user_id: userId,
            option_id: optionId,
          });
          if (insErr) throw insErr;
        }
      } else {
        if (isSelected) {
          const { error: delErr } = await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", poll.id)
            .eq("user_id", userId);
          if (delErr) throw delErr;
        } else {
          await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId);
          const { error: insErr } = await supabase.from("poll_votes").insert({
            poll_id: poll.id,
            user_id: userId,
            option_id: optionId,
          });
          if (insErr) throw insErr;
        }
      }
      const { data: myRows } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", poll.id)
        .eq("user_id", userId);
      const votesAfter = myRows?.length ?? 0;
      applyPollVotePointsFx({ votesBefore, votesAfter, fromEl });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Abstimmung fehlgeschlagen");
    } finally {
      setBusyKey(null);
    }
  }

  const visiblePolls = useMemo(() => {
    if (!activeOnly) return polls;
    const now = Date.now();
    return polls.filter((p) => new Date(p.ends_at).getTime() >= now);
  }, [polls, activeOnly]);

  if (error) {
    return (
      <div className="rounded-2xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Lade Umfragen…
      </div>
    );
  }

  if (!visiblePolls.length) {
    return (
      <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {activeOnly && polls.length
          ? "Aktuell laufen keine Umfragen."
          : "Noch keine Umfragen. Admins können oben „Neue Umfrage erstellen“ wählen."}{" "}
        Migration <span className="font-mono">supabase/010_polls.sql</span> prüfen und Seite
        neu laden.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {visiblePolls.map((poll) => {
        const ended = new Date(poll.ends_at).getTime() < Date.now();
        const totalVotes = voteCountByPoll.get(poll.id) ?? 0;
        const opts = optionsByPoll.get(poll.id) ?? [];
        const counts = new Map<string, number>();
        votes
          .filter((v) => v.poll_id === poll.id)
          .forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));
        const mine = myOptionIdsByPoll.get(poll.id) ?? new Set<string>();
        const hasVoted = mine.size > 0;

        return (
          <Card key={poll.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{poll.question}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {ended ? (
                    <Badge variant="neutral">Beendet</Badge>
                  ) : (
                    <Badge variant="brand">Läuft</Badge>
                  )}
                  {poll.allow_multiple ? (
                    <Badge variant="neutral">Mehrfach</Badge>
                  ) : null}
                  {hasVoted ? (
                    <Badge variant="neutral">Abgestimmt</Badge>
                  ) : null}
                </div>
              </div>
              <PollEndCountdown endsAt={poll.ends_at} className="mt-2" />
              <div className="mt-1 text-xs text-slate-500">
                {totalVotes} Stimme(n) · Ende{" "}
                {new Date(poll.ends_at).toLocaleString("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              {opts.map((o) => {
                const c = counts.get(o.id) ?? 0;
                const pct = totalVotes ? Math.round((c / totalVotes) * 100) : 0;
                const picked = mine.has(o.id);
                const showResults = ended || hasVoted || totalVotes > 0;
                const voters = votersByOptionId[o.id] ?? [];
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={ended || busyKey === `${poll.id}:${o.id}`}
                    onClick={(e) => void toggleVote(poll, o.id, e.currentTarget)}
                    className={cn(
                      "relative w-full overflow-visible rounded-xl border text-left transition",
                      picked ? "border-blue-400 bg-blue-50" : "bg-white hover:bg-slate-50",
                      ended ? "cursor-default opacity-80" : "",
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
                        <PollVoteStats
                          count={c}
                          percent={pct}
                          voters={voters}
                          onMouseEnter={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
              <Link
                href={`/polls/${poll.id}`}
                className="mt-1 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800"
              >
                Details & Kommentare
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
