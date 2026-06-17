"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Heart, MessageCircle, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { flyPointsFromElement } from "@/lib/points/fly";
import { POINT_VALUES } from "@/lib/points/values";
import {
  canAdminDrawGiveaway,
  giveawayPhase,
  isGiveawayOver,
} from "@/lib/giveaways/status-label";
import { RunningCountdownBadge } from "@/components/ui/running-countdown-badge";
import { GiveawayAdminControls } from "@/components/giveaways/giveaway-admin-controls";
import { GiveawayAdminToolbar } from "@/components/giveaways/giveaway-admin-toolbar";
import { GiveawayDrawStatus } from "@/components/giveaways/giveaway-draw-status";
import { GiveawayWinnerReveal } from "@/components/giveaways/giveaway-winner-reveal";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { CommentWarningButton } from "@/components/admin/comment-warning-button";
import {
  drawGiveawayWinners,
  participateQuiz,
  participateQuestion,
  participateSimple,
  sendGiveawayWinnerEmail,
  type QuizParticipationResult,
} from "@/app/(app)/giveaways/actions";
import type { QuestionAnswerReview } from "@/lib/giveaways/load-question-answer";
import { CLUB_SIGNATURE_ID, type MailSignatureOption } from "@/lib/email/signatures";

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
  initialQuestionAnswer = null,
  winners,
  likeCount,
  likedByMe,
  comments,
  isAdmin,
  userId,
  myAvatarUrl,
  signatures,
  yearEndAdmin,
  hasEntries = false,
  entryCount = 0,
  eligibleEntryCount = null,
  initialAdminEdit = false,
  celebrateDraw = false,
}: {
  giveaway: {
    id: string;
    title: string;
    description: string | null;
    entry_mode: "simple" | "quiz" | "question";
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
  initialQuestionAnswer?: QuestionAnswerReview | null;
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
  myAvatarUrl: string | null;
  signatures: MailSignatureOption[];
  yearEndAdmin?: ReactNode;
  /** Mindestens eine Teilnahme — Quiz-Lösungen im Admin gesperrt. */
  hasEntries?: boolean;
  entryCount?: number;
  eligibleEntryCount?: number | null;
  initialAdminEdit?: boolean;
  /** Kurz nach Auslosung: Konfetti + URL-Parameter `?ausgelost=1` */
  celebrateDraw?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const phase = giveawayPhase(giveaway.ends_at, giveaway.status, giveaway.is_paused);
  const giveawayOver = isGiveawayOver(
    giveaway.ends_at,
    giveaway.status,
    giveaway.is_paused,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState({ count: likeCount, mine: likedByMe });
  const [commentDraft, setCommentDraft] = useState("");
  const [commentList, setCommentList] = useState(comments);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizParticipationResult | null>(
    initialQuizResult,
  );
  const [questionAnswer, setQuestionAnswer] = useState<QuestionAnswerReview | null>(
    initialQuestionAnswer,
  );
  const [localEntered, setLocalEntered] = useState(myEntry);
  const [localWinners, setLocalWinners] = useState(winners);
  const [localStatus, setLocalStatus] = useState(giveaway.status);
  const [signatureId, setSignatureId] = useState(CLUB_SIGNATURE_ID);
  const [adminEditingGiveaway, setAdminEditingGiveaway] = useState(initialAdminEdit);
  const [answersExpanded, setAnswersExpanded] = useState(false);
  const [celebrate, setCelebrate] = useState(celebrateDraw);

  const isYearEnd = Boolean(giveaway.is_year_end_lottery);
  const canDrawWinners =
    isAdmin &&
    !isYearEnd &&
    canAdminDrawGiveaway(giveaway.ends_at, localStatus) &&
    localStatus !== "drawn";

  useEffect(() => {
    if (giveawayOver) setAnswersExpanded(false);
  }, [giveawayOver, giveaway.id]);
  const canParticipate =
    !isYearEnd &&
    phase === "active" &&
    !giveaway.is_paused &&
    !localEntered &&
    userId &&
    !adminEditingGiveaway;
  const showWinnerReveal = localStatus === "drawn" && localWinners.length > 0;
  const detailPhase = giveawayPhase(giveaway.ends_at, localStatus, giveaway.is_paused);
  const showDiscussion = detailPhase === "active" || detailPhase === "paused";

  useEffect(() => {
    if (!celebrateDraw) return;
    setCelebrate(true);
    router.replace(pathname, { scroll: false });
  }, [celebrateDraw, pathname, router]);

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

  async function onSubmitQuestion(fromEl: HTMLElement) {
    const q = questions[0];
    if (!q || !quizAnswers[q.id]) {
      setError("Bitte eine Antwort wählen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await participateQuestion(
        giveaway.id,
        JSON.stringify([{ questionId: q.id, optionId: quizAnswers[q.id]! }]),
      );
      const chosen = q.options.find((o) => o.id === quizAnswers[q.id]);
      setQuestionAnswer({
        questionText: q.text,
        optionLabel: chosen?.label ?? "",
      });
      setLocalEntered({ is_eligible: true });
      flyPointsFromElement({ fromEl, delta: +POINT_VALUES.giveawayEntry });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Teilnahme fehlgeschlagen");
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
      window.location.href = `/giveaways/${giveaway.id}?ausgelost=1`;
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
        authorAvatarUrl: myAvatarUrl,
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
      <Link href="/giveaways" className="text-sm font-medium text-fc-blue hover:underline">
        ← Alle Gewinnspiele
      </Link>

      {isAdmin && !isYearEnd ? (
        <GiveawayAdminToolbar
          giveawayId={giveaway.id}
          isPaused={giveaway.is_paused}
          status={localStatus}
          onEdit={() => setAdminEditingGiveaway(true)}
        />
      ) : null}

      {!isYearEnd && !showWinnerReveal ? (
        <GiveawayDrawStatus
          endsAt={giveaway.ends_at}
          status={localStatus}
          isPaused={giveaway.is_paused}
        />
      ) : null}

      {isAdmin && !isYearEnd && adminEditingGiveaway ? (
        <GiveawayAdminControls
          giveaway={giveaway}
          prizes={prizes}
          questions={questions}
          hasEntries={hasEntries}
          hideToolbar
          editing={adminEditingGiveaway}
          onEditingChange={setAdminEditingGiveaway}
        />
      ) : null}

      {showWinnerReveal ? (
        <GiveawayWinnerReveal
          winners={localWinners}
          isAdmin={isAdmin}
          signatures={signatures}
          signatureId={signatureId}
          onSignatureChange={setSignatureId}
          onNotifyWinner={(id) => void onNotifyWinner(id)}
          busy={busy}
          celebrate={celebrate}
        />
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          {!showWinnerReveal ? (
            <RunningCountdownBadge
              endsAt={giveaway.ends_at}
              paused={giveaway.is_paused}
              pausedLabel="Pausiert"
              forceEnded={phase === "ended" || phase === "drawn"}
              className="mb-2 max-w-full justify-start"
            />
          ) : null}
          <CardTitle className={cn("leading-snug", showWinnerReveal ? "text-base text-slate-600" : "text-lg")}>
            {giveaway.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {yearEndAdmin}
          {isAdmin && !isYearEnd && !showWinnerReveal && eligibleEntryCount != null ? (
            <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 text-sm text-amber-950">
              <p>
                <span className="font-semibold">Teilnahmen:</span> {entryCount ?? 0} gesamt ·{" "}
                {eligibleEntryCount} berechtigt zur Auslosung
              </p>
              {canDrawWinners ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDraw()}
                  className="h-11 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-60"
                >
                  Jetzt Gewinner ermitteln
                </button>
              ) : null}
            </div>
          ) : null}
          {!showWinnerReveal && giveaway.description ? (
            <p className="text-sm leading-relaxed text-slate-700">{giveaway.description}</p>
          ) : null}

          {!showWinnerReveal ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preise</h4>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-800">
                {prizes.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </div>
          ) : null}

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
          ) : !showWinnerReveal && localEntered ? (
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
                  : giveaway.entry_mode === "question"
                    ? "Danke — du nimmst am Gewinnspiel teil, wir drücken dir die Daumen!"
                    : "Glückwunsch, alles richtig, nun drücken wir dir die Daumen!"}
            </div>
          ) : phase !== "active" || showWinnerReveal ? null : (
            <p className="text-sm text-slate-600">Noch nicht teilgenommen.</p>
          )}

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          {canParticipate && giveaway.entry_mode === "simple" ? (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => void onParticipateSimple(e.currentTarget)}
              className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Jetzt teilnehmen
            </button>
          ) : null}

          {canParticipate && giveaway.entry_mode === "question" && !localEntered && questions[0] ? (
            <div className="grid gap-3">
              <div className="rounded-xl border p-3">
                <p className="text-sm font-medium text-slate-900">{questions[0].text}</p>
                <div className="mt-2 grid gap-1.5">
                  {questions[0].options.map((o) => (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
                    >
                      <input
                        type="radio"
                        name={`q-${questions[0]!.id}`}
                        checked={quizAnswers[questions[0]!.id] === o.id}
                        onChange={() =>
                          setQuizAnswers((m) => ({ ...m, [questions[0]!.id]: o.id }))
                        }
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => void onSubmitQuestion(e.currentTarget)}
                className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white"
              >
                Antwort absenden
              </button>
            </div>
          ) : null}

          {localEntered && giveaway.entry_mode === "question" && questionAnswer ? (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">{questionAnswer.questionText}</p>
              <p className="mt-1 text-slate-600">Deine Antwort: {questionAnswer.optionLabel}</p>
            </div>
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
                className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white"
              >
                Antworten absenden
              </button>
            </div>
          ) : null}

          {quizReview && localEntered && giveaway.entry_mode === "quiz" && !showWinnerReveal ? (
            <div className="grid gap-2" aria-label="Deine persönliche Teilnahme">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">
                  Deine Antworten
                  {giveawayOver ? "" : " (Teilnahme — nicht bearbeitbar)"}
                </h4>
                {giveawayOver ? (
                  <button
                    type="button"
                    onClick={() => setAnswersExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {answersExpanded ? (
                      <>
                        Ausblenden <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      </>
                    ) : (
                      <>
                        Antworten anzeigen <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      </>
                    )}
                  </button>
                ) : null}
              </div>
              {giveawayOver && !answersExpanded ? (
                <p className="text-xs text-slate-500">
                  Das Gewinnspiel ist beendet — deine Antworten sind nur zur Erinnerung und spielen
                  bei der Auslosung keine Rolle mehr.
                </p>
              ) : null}
              {(!giveawayOver || answersExpanded) &&
                quizReview.map(({ q, r }) =>
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
                              !chosen &&
                                !r.correct &&
                                isCorrectOption &&
                                "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
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

          {showDiscussion ? (
            <>
              <div className="flex items-center gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={(e) => void toggleLike(e.currentTarget)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium",
                    likes.mine ? "bg-rose-50 text-rose-700" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Heart
                    className={cn("h-3.5 w-3.5", likes.mine && "fill-rose-600 text-rose-600")}
                  />
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
                  className="grid h-9 w-9 place-items-center rounded-lg bg-fc-navy text-white"
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
                        <div className="flex items-center gap-1 pr-2">
                          <span className="text-xs font-semibold">{c.authorName}</span>
                          <span className="text-xs text-slate-400"> · {c.createdAtLabel}</span>
                          {isAdmin ? (
                            <div className="ml-auto shrink-0">
                              <CommentWarningButton
                                commentType="giveaway"
                                commentId={c.id}
                                onRemoved={() =>
                                  setCommentList((list) => list.filter((x) => x.id !== c.id))
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                        <p className="text-slate-700">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
