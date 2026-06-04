"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Heart, MessageCircle, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { flyPointsFromElement } from "@/lib/points/fly";
import { POINT_VALUES } from "@/lib/points/values";
import { giveawayPhase } from "@/lib/giveaways/status-label";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { GiveawayAdminControls } from "@/components/giveaways/giveaway-admin-controls";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { CommentWarningButton } from "@/components/admin/comment-warning-button";
import {
  drawGiveawayWinners,
  participateQuiz,
  participateSimple,
  sendGiveawayWinnerEmail,
  type QuizParticipationResult,
} from "@/app/(app)/giveaways/actions";
import type { MailSignatureOption } from "@/lib/email/signatures";

type Question = {
  id: string;
  text: string;
  options: { id: string; label: string; is_correct?: boolean }[];
};

type Winner = {
  id: string;
  prizeName: string;
  userName: string;
  avatarUrl: string | null;
  notifiedAt: string | null;
};

export function GiveawayDetailClient({
  giveaway,
  prizes,
  questions,
  myEntry,
  initialQuizResult = null,
  winners,
  likeCount,
  likedByMe,
  comments,
  isAdmin,
  userId,
  signatures,
  yearEndAdmin,
  hasEntries = false,
}: {
  giveaway: {
    id: string;
    title: string;
    description: string | null;
    entry_mode: "simple" | "quiz";
    ends_at: string;
    status: string;
    is_paused: boolean;
    is_year_end_lottery?: boolean;
    points_year?: number | null;
  };
  prizes: { id: string; name: string }[];
  questions: Question[];
  myEntry: { is_eligible: boolean } | null;
  initialQuizResult?: QuizParticipationResult | null;
  winners: Winner[];
  likeCount: number;
  likedByMe: boolean;
  comments: Array<{
    id: string;
    body: string;
    authorName: string;
    authorAvatarUrl: string | null;
    createdAtLabel: string;
  }>;
  isAdmin: boolean;
  userId: string | null;
  signatures: MailSignatureOption[];
  yearEndAdmin?: ReactNode;
  /** Mindestens eine Teilnahme — Quiz-Lösungen im Admin gesperrt. */
  hasEntries?: boolean;
}) {
  const phase = giveawayPhase(giveaway.ends_at, giveaway.status, giveaway.is_paused);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState({ count: likeCount, mine: likedByMe });
  const [commentDraft, setCommentDraft] = useState("");
  const [commentList, setCommentList] = useState(comments);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizParticipationResult | null>(
    initialQuizResult,
  );
  const [localEntered, setLocalEntered] = useState(myEntry);
  const [localWinners, setLocalWinners] = useState(winners);
  const [localStatus, setLocalStatus] = useState(giveaway.status);
  const [signatureId, setSignatureId] = useState(signatures[0]?.id ?? "");
  const [adminEditingGiveaway, setAdminEditingGiveaway] = useState(false);

  const isYearEnd = Boolean(giveaway.is_year_end_lottery);
  const canParticipate =
    !isYearEnd &&
    phase === "active" &&
    !giveaway.is_paused &&
    !localEntered &&
    userId &&
    !adminEditingGiveaway;
  const showWinners = localStatus === "drawn" && localWinners.length > 0;

  const quizReview = useMemo(() => {
    if (!quizResult) return null;
    const byQ = new Map(quizResult.results.map((r) => [r.questionId, r]));
    return questions.map((q) => ({ q, r: byQ.get(q.id) }));
  }, [quizResult, questions]);

  async function onParticipateSimple(fromEl: HTMLElement) {
    setBusy(true);
    setError(null);
    try {
      await participateSimple(giveaway.id);
      setLocalEntered({ is_eligible: true });
      flyPointsFromElement({ fromEl, delta: +POINT_VALUES.giveawayEntry });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Teilnahme fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitQuiz(fromEl: HTMLElement) {
    if (questions.some((q) => !quizAnswers[q.id])) {
      setError("Bitte jede Frage beantworten.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        optionId: quizAnswers[q.id]!,
      }));
      const result = await participateQuiz(giveaway.id, JSON.stringify(payload));
      setQuizResult(result);
      setLocalEntered({ is_eligible: result.eligible });
      if (result.eligible) flyPointsFromElement({ fromEl, delta: +POINT_VALUES.giveawayEntry });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function onDraw() {
    if (
      !window.confirm(
        "Gewinner jetzt zufällig ermitteln? Es werden höchstens so viele Preise vergeben wie berechtigte Teilnehmer vorhanden sind.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await drawGiveawayWinners(giveaway.id);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auslosung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function onNotifyWinner(winnerId: string) {
    setBusy(true);
    setError(null);
    try {
      await sendGiveawayWinnerEmail(winnerId, signatureId || undefined);
      setLocalWinners((w) =>
        w.map((x) =>
          x.id === winnerId ? { ...x, notifiedAt: new Date().toISOString() } : x,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "E-Mail fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(fromEl: HTMLElement) {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    const next = !likes.mine;
    setLikes((l) => ({
      mine: next,
      count: Math.max(0, l.count + (next ? 1 : -1)),
    }));
    try {
      if (next) {
        await supabase.from("giveaway_likes").insert({
          giveaway_id: giveaway.id,
          user_id: userId,
        });
        flyPointsFromElement({ fromEl, delta: +1 });
      } else {
        await supabase
          .from("giveaway_likes")
          .delete()
          .eq("giveaway_id", giveaway.id)
          .eq("user_id", userId);
        flyPointsFromElement({ fromEl, delta: -1 });
      }
    } catch {
      setLikes((l) => ({
        mine: !next,
        count: Math.max(0, l.count + (next ? -1 : 1)),
      }));
    }
  }

  async function addComment() {
    const text = commentDraft.trim();
    if (!text || !userId) return;
    const supabase = createSupabaseBrowserClient();
    const { data, error: insErr } = await supabase
      .from("giveaway_comments")
      .insert({ giveaway_id: giveaway.id, author_id: userId, body: text })
      .select("id,body,created_at")
      .single();
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setCommentDraft("");
    setCommentList((c) => [
      {
        id: data.id,
        body: data.body,
        authorName: "Du",
        authorAvatarUrl: null,
        createdAtLabel: new Date(data.created_at).toLocaleString("de-DE", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      },
      ...c,
    ]);
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Link href="/giveaways" className="text-sm font-medium text-blue-600 hover:underline">
        ← Alle Gewinnspiele
      </Link>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-lg">{giveaway.title}</CardTitle>
            <RunningCountdownBadge
              endsAt={giveaway.ends_at}
              paused={giveaway.is_paused}
              pausedLabel="Pausiert"
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {yearEndAdmin}
          {isAdmin && !isYearEnd ? (
            <GiveawayAdminControls
              giveaway={giveaway}
              prizes={prizes}
              questions={questions}
              hasEntries={hasEntries}
              onEditingChange={setAdminEditingGiveaway}
            />
          ) : null}

          {giveaway.description ? (
            <p className="text-sm leading-relaxed text-slate-700">{giveaway.description}</p>
          ) : null}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preise</h4>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-800">
              {prizes.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          </div>

          {isYearEnd ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-sm text-violet-950">
              {localEntered
                ? `Du gehörst zu den Top-10 der Statuspunkte ${giveaway.points_year ?? ""} und nimmst automatisch teil.`
                : `Sonderverlosung nur für die Top-10 der Statuspunkte ${giveaway.points_year ?? ""}. Eine Anmeldung ist nicht möglich.`}
              {localStatus !== "drawn" ? (
                <span className="mt-1 block text-slate-600">
                  Die Auslosung erfolgt, sobald der Vorstand die Preise eingetragen und bestätigt hat.
                </span>
              ) : null}
            </div>
          ) : localEntered ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium",
                !localEntered.is_eligible
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900",
              )}
            >
              {!localEntered.is_eligible
                ? "Leider hat es diesmal nicht geklappt"
                : giveaway.entry_mode === "simple"
                  ? "Glückwunsch, du nimmst nun am Gewinnspiel teil, wir drücken dir die Daumen!"
                  : "Glückwunsch, alles richtig, nun drücken wir dir die Daumen!"}
            </div>
          ) : phase !== "active" ? null : (
            <p className="text-sm text-slate-600">Noch nicht teilgenommen.</p>
          )}

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          {canParticipate && giveaway.entry_mode === "simple" ? (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => void onParticipateSimple(e.currentTarget)}
              className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Jetzt teilnehmen
            </button>
          ) : null}

          {canParticipate && giveaway.entry_mode === "quiz" && !localEntered ? (
            <div className="grid gap-3">
              {questions.map((q) => (
                <div key={q.id} className="rounded-xl border p-3">
                  <p className="text-sm font-medium text-slate-900">{q.text}</p>
                  <div className="mt-2 grid gap-1.5">
                    {q.options.map((o) => (
                      <label
                        key={o.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={quizAnswers[q.id] === o.id}
                          onChange={() =>
                            setQuizAnswers((m) => ({ ...m, [q.id]: o.id }))
                          }
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={(e) => void onSubmitQuiz(e.currentTarget)}
                className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                Antworten absenden
              </button>
            </div>
          ) : null}

          {quizReview && localEntered && giveaway.entry_mode === "quiz" ? (
            <div className="grid gap-2" aria-label="Deine persönliche Teilnahme">
              <h4 className="text-sm font-semibold text-slate-900">
                Deine Antworten (Teilnahme — nicht bearbeitbar)
              </h4>
              {quizReview.map(({ q, r }) =>
                r ? (
                  <div key={q.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium text-slate-800">{q.text}</p>
                    {q.options.map((o) => {
                      const chosen = o.id === r.optionId;
                      const isCorrectOption = o.id === r.correctOptionId;
                      return (
                        <div
                          key={o.id}
                          className={cn(
                            "mt-1 rounded-md px-2 py-1",
                            chosen && r.correct && "bg-emerald-100 text-emerald-900",
                            chosen && !r.correct && "bg-rose-100 text-rose-900",
                            !chosen && !r.correct && isCorrectOption && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
                          )}
                        >
                          {o.label}
                          {chosen ? (r.correct ? " ✓" : " ✗") : null}
                          {!chosen && !r.correct && isCorrectOption ? " (richtig)" : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null,
              )}
            </div>
          ) : null}

          {isAdmin &&
          !isYearEnd &&
          (phase === "ended" || phase === "drawn") &&
          localStatus !== "drawn" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDraw()}
              className="h-11 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white"
            >
              Jetzt Gewinner ermitteln
            </button>
          ) : null}

          {isAdmin && showWinners ? (
            <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <h4 className="text-sm font-semibold text-amber-950">Gewinner (Admin)</h4>
              {signatures.length ? (
                <label className="grid gap-1 text-xs text-amber-950">
                  Signatur für Gewinner-E-Mails
                  <select
                    value={signatureId}
                    onChange={(e) => setSignatureId(e.target.value)}
                    className="h-9 rounded-lg border bg-white px-2"
                  >
                    {signatures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {localWinners.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{w.userName}</span>
                    <span className="text-slate-600"> — {w.prizeName}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy || Boolean(w.notifiedAt)}
                    onClick={() => void onNotifyWinner(w.id)}
                    className="rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    {w.notifiedAt ? "E-Mail gesendet" : "Per E-Mail benachrichtigen"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {showWinners ? (
            <div className="grid gap-3">
              <h4 className="text-sm font-semibold text-slate-900">Gewinner</h4>
              {localWinners.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="h-8 w-8 overflow-hidden rounded-full border bg-slate-50">
                    {w.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs font-semibold text-slate-600">
                        {w.userName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join("")}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{w.userName}</div>
                    <div className="text-xs text-slate-600">{w.prizeName}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-t pt-3">
            <button
              type="button"
              onClick={(e) => void toggleLike(e.currentTarget)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium",
                likes.mine ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", likes.mine && "fill-rose-600 text-rose-600")} />
              {likes.count || "Like"}
            </button>
            <span className="text-xs text-slate-500">
              <MessageCircle className="mr-0.5 inline h-3.5 w-3.5" />
              {commentList.length} Kommentare
            </span>
          </div>

          <div className="flex gap-2">
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Kommentieren…"
              className="h-9 flex-1 rounded-lg border px-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void addComment()}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white"
              aria-label="Senden"
            >
              <SendHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>

          {commentList.length ? (
            <div className="grid gap-2">
              {commentList.map((c) => (
                <div key={c.id} className="flex gap-2 text-sm">
                  <HoverEnlargeAvatar
                    name={c.authorName}
                    avatarUrl={c.authorAvatarUrl}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold">{c.authorName}</span>
                      <span className="text-xs text-slate-400"> · {c.createdAtLabel}</span>
                      {isAdmin ? (
                        <CommentWarningButton
                          commentType="giveaway"
                          commentId={c.id}
                          onDone={() =>
                            setCommentList((list) => list.filter((x) => x.id !== c.id))
                          }
                        />
                      ) : null}
                    </div>
                    <p className="text-slate-700">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
