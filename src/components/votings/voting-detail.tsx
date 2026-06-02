"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type Voting = {
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

export function VotingDetail({ votingId }: { votingId: string }) {
  const [voting, setVoting] = useState<Voting | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myOptionIds, setMyOptionIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ended = voting ? new Date(voting.ends_at).getTime() < Date.now() : false;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    votes.forEach((v) => m.set(v.option_id, (m.get(v.option_id) ?? 0) + 1));
    return m;
  }, [votes]);

  const totalVotes = votes.length;

  async function load() {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: votingRow, error: vErr } = await supabase
      .from("votings")
      .select("id,question,allow_multiple,ends_at")
      .eq("id", votingId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!votingRow) {
      setError("Voting nicht gefunden.");
      return;
    }
    setVoting(votingRow);

    const { data: optRows, error: optErr } = await supabase
      .from("voting_options")
      .select("id,label,sort_order")
      .eq("voting_id", votingId)
      .order("sort_order", { ascending: true });
    if (optErr) throw optErr;
    setOptions(optRows ?? []);

    const { data: voteRows, error: voteErr } = await supabase
      .from("voting_votes")
      .select("option_id,user_id")
      .eq("voting_id", votingId);
    if (voteErr) throw voteErr;
    setVotes(voteRows ?? []);
    const mine = new Set(
      (voteRows ?? []).filter((r) => r.user_id === user.id).map((r) => r.option_id),
    );
    setMyOptionIds(mine);
    setSelected(mine);

    const { data: commentRows, error: cErr } = await supabase
      .from("voting_comments")
      .select("id,body,created_at,author_id")
      .eq("voting_id", votingId)
      .order("created_at", { ascending: false });
    if (cErr) throw cErr;

    const authorIds = Array.from(new Set((commentRows ?? []).map((c) => c.author_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path")
      .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        {
          name:
            p.first_name && p.last_name
              ? `${p.first_name} ${p.last_name}`
              : (p.email ?? "Mitglied"),
          avatarUrl: getAvatarPublicUrl(p.avatar_path),
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
      setError("Laden fehlgeschlagen. `supabase/012_votings.sql` ausgeführt?");
    });
  }, [votingId]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`voting:${votingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voting_votes", filter: `voting_id=eq.${votingId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [votingId, userId]);

  function toggleOption(optionId: string) {
    if (!voting || ended || myOptionIds.size > 0) return;
    if (voting.allow_multiple) {
      setSelected((s) => {
        const next = new Set(s);
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
        return next;
      });
    } else {
      setSelected(new Set([optionId]));
    }
  }

  async function submitVote() {
    if (!voting || !userId || ended || myOptionIds.size > 0) return;
    if (!selected.size) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!voting.allow_multiple) {
        await supabase
          .from("voting_votes")
          .delete()
          .eq("voting_id", votingId)
          .eq("user_id", userId);
      }
      const rows = Array.from(selected).map((option_id) => ({
        voting_id: votingId,
        user_id: userId,
        option_id,
      }));
      const { error: insErr } = await supabase.from("voting_votes").insert(rows);
      if (insErr) throw insErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Abstimmung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  }

  async function addComment() {
    const text = commentDraft.trim();
    if (!text || !userId) return;
    const supabase = createSupabaseBrowserClient();
    const { error: insErr } = await supabase.from("voting_comments").insert({
      voting_id: votingId,
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

  if (error && !voting) {
    return (
      <div className="rounded-2xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}
      </div>
    );
  }

  if (!voting) return <div className="text-sm text-slate-600">Lade Voting…</div>;

  const hasVoted = myOptionIds.size > 0;

  return (
    <div className="grid gap-4">
      <Link href="/votings" className="text-sm font-medium text-blue-600 hover:underline">
        ← Alle Votings
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle>{voting.question}</CardTitle>
            {ended ? <Badge variant="neutral">Beendet</Badge> : <Badge variant="brand">Läuft</Badge>}
          </div>
          <div className="text-xs text-slate-500">
            Ende:{" "}
            {new Date(voting.ends_at).toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {voting.allow_multiple ? " · Mehrfachauswahl" : " · Eine Antwort"}
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {options.map((o) => {
            const c = counts.get(o.id) ?? 0;
            const pct = totalVotes ? Math.round((c / totalVotes) * 100) : 0;
            const picked = selected.has(o.id);
            const showResults = hasVoted || ended;
            return (
              <button
                key={o.id}
                type="button"
                disabled={ended || hasVoted}
                onClick={() => toggleOption(o.id)}
                className={cn(
                  "relative w-full overflow-hidden rounded-xl border text-left transition",
                  picked && !hasVoted ? "border-blue-400 bg-blue-50" : "bg-white hover:bg-slate-50",
                  (ended || hasVoted) && "cursor-default",
                )}
              >
                {showResults ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-50/90 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                ) : null}
                <div className="relative flex items-center justify-between gap-3 px-3 py-3 text-sm">
                  <span className="font-medium text-slate-800">{o.label}</span>
                  {showResults ? (
                    <span className="text-slate-600">
                      {c} ({pct}%)
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}

          {!hasVoted && !ended ? (
            <button
              type="button"
              disabled={submitting || selected.size === 0}
              onClick={() => void submitVote()}
              className="mt-2 h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Speichere…" : "Stimme abgeben"}
            </button>
          ) : null}

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
            {!comments.length ? <div className="text-sm text-slate-500">Noch keine Kommentare.</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

