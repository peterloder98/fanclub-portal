"use client";

import { useEffect, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { submitLiveSessionQuestion } from "@/app/(app)/live/actions";
import { LIVE_SESSION_QUESTION_MAX_LEN } from "@/lib/live/types";

export function LiveMemberQuestions({
  sessionId,
  enabled,
}: {
  sessionId: string;
  enabled: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [mine, setMine] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("live_session_questions")
        .select("id,body,created_at,dismissed_at")
        .eq("session_id", sessionId)
        .eq("author_id", user.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (cancelled) return;
      setMine(
        (data ?? []).map((q) => ({
          id: q.id,
          body: q.body,
          createdAt: q.created_at,
        })),
      );
    })();

    const channel = supabase
      .channel(`live-session-questions-mine:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_session_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void (async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
              .from("live_session_questions")
              .select("id,body,created_at")
              .eq("session_id", sessionId)
              .eq("author_id", user.id)
              .is("dismissed_at", null)
              .order("created_at", { ascending: false })
              .limit(20);
            setMine(
              (data ?? []).map((q) => ({
                id: q.id,
                body: q.body,
                createdAt: q.created_at,
              })),
            );
          })();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, enabled]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const result = await submitLiveSessionQuestion(sessionId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
      setOkMsg("Frage gesendet — Anni sieht sie in ihrer Liste.");
    });
  }

  if (!enabled) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-fc-navy">Frage an Anni</h2>
      <p className="mt-1 text-sm text-slate-600">
        Schreib deine Frage — Anni sieht sie chronologisch und kann sie abhaken.
      </p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, LIVE_SESSION_QUESTION_MAX_LEN))}
          rows={3}
          maxLength={LIVE_SESSION_QUESTION_MAX_LEN}
          placeholder="Deine Frage…"
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-slate-400">
            {draft.length}/{LIVE_SESSION_QUESTION_MAX_LEN}
          </span>
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="h-10 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
          >
            {pending ? "Sende…" : "Frage senden"}
          </button>
        </div>
      </form>
      {error ? (
        <p className="mt-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {okMsg ? <p className="mt-2 text-sm text-emerald-700">{okMsg}</p> : null}
      {userId && mine.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <li className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Deine offenen Fragen
          </li>
          {mine.map((q) => (
            <li key={q.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {q.body}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
