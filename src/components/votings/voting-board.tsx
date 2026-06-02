"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type VotingRow = {
  id: string;
  question: string;
  allow_multiple: boolean;
  ends_at: string;
  created_at: string;
};

type OptionRow = { id: string; voting_id: string; label: string; sort_order: number };
type VoteRow = { voting_id: string; option_id: string; user_id: string };

export function VotingBoard({
  initialVotings = [],
}: {
  initialVotings?: VotingRow[];
}) {
  const searchParams = useSearchParams();
  const refreshToken = searchParams.get("refresh");
  const [votings, setVotings] = useState<VotingRow[]>(initialVotings);
  const [loading, setLoading] = useState(!initialVotings.length);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [myVotings, setMyVotings] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const optionsByVoting = useMemo(() => {
    const m = new Map<string, OptionRow[]>();
    options.forEach((o) => {
      if (!m.has(o.voting_id)) m.set(o.voting_id, []);
      m.get(o.voting_id)!.push(o);
    });
    m.forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return m;
  }, [options]);

  const voteCountByVoting = useMemo(() => {
    const m = new Map<string, number>();
    votes.forEach((v) => m.set(v.voting_id, (m.get(v.voting_id) ?? 0) + 1));
    return m;
  }, [votes]);

  useEffect(() => {
    if (initialVotings.length) {
      setVotings(initialVotings);
      setLoading(false);
    }
  }, [initialVotings]);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: votingRows, error: vErr } = await supabase
      .from("votings")
      .select("id,question,allow_multiple,ends_at,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (vErr) throw vErr;
    const rows = votingRows ?? [];
    setVotings((prev) => {
      if (rows.length > 0) return rows;
      if (refreshToken) return rows;
      return prev.length ? prev : rows;
    });

    const votingIds = (votingRows ?? []).map((v) => v.id);
    if (!votingIds.length) {
      setOptions([]);
      setVotes([]);
      return;
    }

    const { data: optRows, error: optErr } = await supabase
      .from("voting_options")
      .select("id,voting_id,label,sort_order")
      .in("voting_id", votingIds)
      .order("sort_order", { ascending: true });
    if (optErr) throw optErr;
    setOptions(optRows ?? []);

    const { data: voteRows, error: voteErr } = await supabase
      .from("voting_votes")
      .select("voting_id,option_id,user_id")
      .in("voting_id", votingIds);
    if (voteErr) throw voteErr;
    setVotes(voteRows ?? []);
    setMyVotings(
      new Set((voteRows ?? []).filter((r) => r.user_id === user.id).map((r) => r.voting_id)),
    );
    setLoading(false);
  }, [refreshToken]);

  useEffect(() => {
    void load().catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes("votings") || msg.includes("does not exist")
          ? "Votings-Tabelle fehlt. Bitte `supabase/012_votings.sql` in Supabase ausführen."
          : `Votings konnten nicht geladen werden: ${msg}`,
      );
    });
  }, [load, refreshToken]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("voting-votes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voting_votes" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

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
        Lade Votings…
      </div>
    );
  }

  if (!votings.length) {
    return (
      <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Noch keine Votings. Admins legen oben ein neues Voting an. Falls du gerade
        eins erstellt hast: Migration{" "}
        <span className="font-mono">supabase/012_votings.sql</span> in Supabase
        ausführen und Seite neu laden.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {votings.map((v) => {
        const ended = new Date(v.ends_at).getTime() < Date.now();
        const total = voteCountByVoting.get(v.id) ?? 0;
        const opts = optionsByVoting.get(v.id) ?? [];
        const counts = new Map<string, number>();
        votes
          .filter((r) => r.voting_id === v.id)
          .forEach((r) => counts.set(r.option_id, (counts.get(r.option_id) ?? 0) + 1));

        return (
          <Card key={v.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base">{v.question}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {ended ? <Badge variant="neutral">Beendet</Badge> : <Badge variant="brand">Läuft</Badge>}
                  {v.allow_multiple ? <Badge variant="neutral">Mehrfach</Badge> : null}
                  {myVotings.has(v.id) ? <Badge variant="neutral">Abgestimmt</Badge> : null}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Ende:{" "}
                {new Date(v.ends_at).toLocaleString("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · {total} Stimme(n)
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              {opts.map((o) => {
                const c = counts.get(o.id) ?? 0;
                const pct = total ? Math.round((c / total) * 100) : 0;
                return (
                  <div key={o.id} className="relative overflow-hidden rounded-xl border bg-white">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-50/90 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{o.label}</span>
                      <span className="text-slate-600">
                        {c} ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}

              <Link
                href={`/votings/${v.id}`}
                className="mt-1 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800"
              >
                {ended ? "Ergebnisse & Kommentare" : "Abstimmen & Kommentieren"}
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

