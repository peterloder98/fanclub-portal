"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { applyPollVotePointsFx } from "@/lib/points/poll-vote-fx";
import { PollHeaderMeta } from "@/components/polls/poll-header-meta";
import { pollOptionButtonClass } from "@/components/polls/poll-option-styles";
import { PollOptionProgress, pollPercent } from "@/components/polls/poll-option-progress";
import { PollVoteStats } from "@/components/polls/poll-vote-stats";
import { PollParticipantSummary } from "@/components/polls/poll-participant-summary";

type Poll = {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string;
};

type Option = { id: string; label: string; sort_order: number };
type Vote = { option_id: string; user_id: string };
type Comment = {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

export function PollDetail({ pollId }: { pollId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myOptionIds, setMyOptionIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyOptionId, setBusyOptionId] = useState<string | null>(null);
  const [votersByOption, setVotersByOption] = useState<
    Record<string, Array<{ id: string; name: string; avatarUrl: string | null }>>
  >({});
  const [participants, setParticipants] = useState<
    Array<{ id: string; name: string; avatarUrl: string | null }>
  >([]);

  const ended = poll ? new Date(poll.ends_at).getTime() < Date.now() : false;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    votes.forEach((v) => m.set(v.option_id, (m.get(v.option_id) ?? 0) + 1));
    return m;
  }, [votes]);

  const totalVotes = votes.length;
  const participantCount = useMemo(
    () => new Set(votes.map((v) => v.user_id)).size,
    [votes],
  );

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: pollRow, error: pollErr } = await supabase
      .from("polls")
      .select("id,question,allow_multiple,ends_at")
      .eq("id", pollId)
      .maybeSingle();
    if (pollErr) throw pollErr;
    if (!pollRow) {
      setError("Umfrage nicht gefunden.");
      return;
    }
    setPoll(pollRow);

    const { data: optRows, error: optErr } = await supabase
      .from("poll_options")
      .select("id,label,sort_order")
      .eq("poll_id", pollId)
      .order("sort_order", { ascending: true });
    if (optErr) throw optErr;
    setOptions(optRows ?? []);

    const { data: voteRows, error: voteErr } = await supabase
      .from("poll_votes")
      .select("option_id,user_id")
      .eq("poll_id", pollId);
    if (voteErr) throw voteErr;
    setVotes(voteRows ?? []);
    const mine = new Set(
      (voteRows ?? []).filter((v) => v.user_id === user.id).map((v) => v.option_id),
    );
    setMyOptionIds(mine);
    setSelected(mine);
    setVotersByOption({});

    const { data: commentRows, error: cErr } = await supabase
      .from("poll_comments")
      .select("id,body,created_at,author_id")
      .eq("poll_id", pollId)
      .order("created_at", { ascending: false });
    if (cErr) throw cErr;

    const authorIds = Array.from(
      new Set((commentRows ?? []).map((c) => c.author_id)),
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          name:
            p.first_name && p.last_name
              ? `${p.first_name} ${p.last_name}`
              : (p.email ?? "Mitglied"),
          avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
        },
      ]),
    );

    setComments(
      (commentRows ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        authorName: profileMap.get(c.author_id)?.name ?? "Mitglied",
        authorAvatarUrl: profileMap.get(c.author_id)?.avatarUrl ?? null,
      })),
    );
  }

  useEffect(() => {
    void load().catch(() => {
      setError("Laden fehlgeschlagen. `supabase/010_polls.sql` ausgeführt?");
    });
  }, [pollId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`poll:${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pollId, userId]);

  async function toggleVote(optionId: string, fromEl: HTMLElement | null) {
    if (!poll || !userId || ended) return;
    if (busyOptionId) return;

    setBusyOptionId(optionId);
    setError(null);
    const supabase = createSupabaseBrowserClient();

    const votesBefore = myOptionIds.size;
    const isSelected = myOptionIds.has(optionId);

    try {
      if (poll.allow_multiple) {
        if (isSelected) {
          const { error: delErr } = await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", pollId)
            .eq("user_id", userId)
            .eq("option_id", optionId);
          if (delErr) throw delErr;
        } else {
          const { error: insErr } = await supabase.from("poll_votes").insert({
            poll_id: pollId,
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
            .eq("poll_id", pollId)
            .eq("user_id", userId);
          if (delErr) throw delErr;
        } else {
          await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", pollId)
            .eq("user_id", userId);
          const { error: insErr } = await supabase.from("poll_votes").insert({
            poll_id: pollId,
            user_id: userId,
            option_id: optionId,
          });
          if (insErr) throw insErr;
        }
      }

      const { data: myRows } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", userId);
      const votesAfter = myRows?.length ?? 0;
      if (fromEl) {
        applyPollVotePointsFx({ votesBefore, votesAfter, fromEl });
      }

      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Abstimmung fehlgeschlagen");
    } finally {
      setBusyOptionId(null);
    }
  }

  async function ensureParticipants() {
    if (participants.length) return;
    const supabase = createSupabaseBrowserClient();
    const ids = Array.from(new Set(votes.map((v) => v.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    setParticipants(
      (profiles ?? []).map((p) => ({
        id: p.id,
        name:
          p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      })),
    );
  }

  async function ensureVoters(optionId: string) {
    const supabase = createSupabaseBrowserClient();
    const { data: vRows, error: vErr } = await supabase
      .from("poll_votes")
      .select("user_id")
      .eq("option_id", optionId);
    if (vErr) return;
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
    setVotersByOption((m) => ({ ...m, [optionId]: mapped }));
  }

  async function addComment() {
    const text = commentDraft.trim();
    if (!text || !userId) return;
    const supabase = createSupabaseBrowserClient();
    const { error: insErr } = await supabase.from("poll_comments").insert({
      poll_id: pollId,
      author_id: userId,
      body: text,
    });
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setCommentDraft("");
    await load();
  }

  if (error && !poll) {
    return (
      <div className="rounded-2xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}
      </div>
    );
  }

  if (!poll) {
    return <div className="text-sm text-slate-600">Lade Umfrage…</div>;
  }

  const hasVoted = myOptionIds.size > 0;

  return (
    <div className="grid gap-4">
      <Link href="/polls" className="text-sm font-medium text-blue-600 hover:underline">
        ← Alle Umfragen
      </Link>

      <Card>
        <CardHeader>
          <PollHeaderMeta
            question={poll.question}
            endsAt={poll.ends_at}
            allowMultiple={poll.allow_multiple}
            hasVoted={hasVoted}
            ended={ended}
          />
          <PollParticipantSummary
            participantCount={participantCount}
            participants={participants}
            onEnsureParticipants={() => void ensureParticipants()}
            className="mt-2 block"
          />
        </CardHeader>
        <CardContent className="grid gap-1.5">
          {options.map((o) => {
            const c = counts.get(o.id) ?? 0;
            const { display: pct, bar: barPct } = pollPercent(c, totalVotes);
            const picked = myOptionIds.has(o.id);
            const showResults = hasVoted || ended || totalVotes > 0;

            return (
              <button
                key={o.id}
                type="button"
                disabled={ended || busyOptionId === o.id}
                onClick={(e) => void toggleVote(o.id, e.currentTarget)}
                onMouseEnter={() => void ensureVoters(o.id)}
                className={pollOptionButtonClass(picked, ended)}
              >
                {showResults ? <PollOptionProgress percent={barPct} /> : null}
                <div className="relative z-10 flex min-h-[48px] items-center gap-3 px-3 py-3 text-sm">
                  <span className="min-w-0 flex-1 font-medium text-slate-800">{o.label}</span>
                  {showResults ? (
                    <PollVoteStats
                      count={c}
                      percent={pct}
                      voters={votersByOption[o.id] ?? []}
                      isMyVote={myOptionIds.has(o.id)}
                      reserveMyVoteSlot={hasVoted}
                      loading={!(o.id in votersByOption)}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        void ensureVoters(o.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}

          {error ? (
            <div className="rounded-xl border bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kommentare</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Kommentar schreiben…"
              className="h-10 flex-1 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
            <button
              type="button"
              onClick={() => void addComment()}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              Senden
            </button>
          </div>
          <div className="grid gap-2">
            {comments.map((c) => (
              <div key={c.id} className="rounded-xl border bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <div className="h-6 w-6 overflow-hidden rounded-full border bg-white">
                    {c.authorAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[9px] font-semibold">
                        {c.authorName[0]}
                      </div>
                    )}
                  </div>
                  <span className="font-semibold text-slate-700">{c.authorName}</span>
                  <span>·</span>
                  <span>
                    {new Date(c.created_at).toLocaleString("de-DE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-800">{c.body}</div>
              </div>
            ))}
            {!comments.length ? (
              <div className="text-sm text-slate-500">Noch keine Kommentare.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
