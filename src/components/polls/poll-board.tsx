"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { applyPollVotePointsFx } from "@/lib/points/poll-vote-fx";
import { profileToUserListEntry } from "@/lib/profiles/display";
import { PieChart } from "lucide-react";
import { PollHeaderMeta } from "@/components/polls/poll-header-meta";
import { PollOptionsList } from "@/components/polls/poll-options-list";
import { PollParticipantSummary } from "@/components/polls/poll-participant-summary";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { invalidatePollVoterCache } from "@/lib/polls/invalidate-voter-cache";

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
  const [participantsByPollId, setParticipantsByPollId] = useState<Record<string, Voter[]>>({});
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

  async function ensurePollParticipants(pollId: string) {
    if (participantsByPollId[pollId]) return;
    const supabase = createSupabaseBrowserClient();
    const { data: vRows } = await supabase
      .from("poll_votes")
      .select("user_id")
      .eq("poll_id", pollId);
    const ids = Array.from(new Set((vRows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const mapped =
      (profiles ?? []).map((p) => ({
        id: p.id,
        name:
          p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      })) ?? [];
    setParticipantsByPollId((m) => ({ ...m, [pollId]: mapped }));
  }

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
      const optionIdsForPoll = options.filter((o) => o.poll_id === poll.id).map((o) => o.id);
      invalidatePollVoterCache(setVotersByOptionId, optionIdsForPoll);
      setParticipantsByPollId((m) => {
        const next = { ...m };
        delete next[poll.id];
        return next;
      });
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
        const opts = optionsByPoll.get(poll.id) ?? [];
        const pollVotesList = votes.filter((v) => v.poll_id === poll.id);
        const participantCount = new Set(pollVotesList.map((v) => v.user_id)).size;
        const totalVoteSum = pollVotesList.length;
        const counts = new Map<string, number>();
        votes
          .filter((v) => v.poll_id === poll.id)
          .forEach((v) => counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1));
        const mine = myOptionIdsByPoll.get(poll.id) ?? new Set<string>();
        const hasVoted = mine.size > 0;

        return (
          <Card key={poll.id} className="overflow-hidden">
            <CardHeader className="space-y-0 pb-0">
              <PollHeaderMeta
                question={poll.question}
                endsAt={poll.ends_at}
                allowMultiple={poll.allow_multiple}
                hasVoted={hasVoted}
                ended={ended}
                icon={<PieChart className="h-4 w-4 text-blue-600" />}
              />
              <div className="mt-3 border-t border-slate-100 py-3">
                <PollParticipantSummary
                  participantCount={participantCount}
                  participants={participantsByPollId[poll.id] ?? []}
                  onEnsureParticipants={() => void ensurePollParticipants(poll.id)}
                  align="start"
                />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pb-4 pt-0">
              <PollOptionsList
                pollId={poll.id}
                opts={opts}
                counts={counts}
                totalVoteSum={totalVoteSum}
                ended={ended}
                hasVoted={hasVoted}
                myOptionIds={mine}
                votersByOptionId={votersByOptionId}
                busyKey={busyKey}
                onToggleVote={(optionId, fromEl) => void toggleVote(poll, optionId, fromEl)}
                onEnsureVoters={() => {}}
              />
              <Link
                href={`/polls/${poll.id}`}
                className="inline-flex text-xs font-medium text-blue-600 hover:underline"
              >
                Details & Kommentare →
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
