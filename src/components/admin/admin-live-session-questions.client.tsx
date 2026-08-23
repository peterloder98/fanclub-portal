"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  dismissLiveSessionQuestionAdminAction,
  listLiveSessionQuestionsAction,
  removeLiveSessionQuestionAdminAction,
  type AdminLiveQuestionRow,
} from "@/app/(app)/admin/live/actions";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { MemberProfileAnchor } from "@/components/members/member-profile-anchor";
import { formatChatTime } from "@/lib/chat/types";
import { cn } from "@/lib/cn";

function QuestionWarnButton({
  questionId,
  onRemoved,
}: {
  questionId: string;
  onRemoved: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const warnOk = window.confirm(
          "Verwarnung aussprechen und automatische E-Mail an das Mitglied senden?",
        );
        if (!warnOk) return;
        const deleteOk = window.confirm(
          "Frage zusätzlich löschen?\n\nOK = löschen + verwarnen\nAbbrechen = nur verwarnen (bleibt stehen)",
        );
        if (deleteOk) onRemoved();
        setPending(true);
        void (async () => {
          try {
            const result = await issueCommentWarning({
              commentType: "live_question",
              commentId: questionId,
              deleteComment: deleteOk,
            });
            if (result.isThirdWarning) {
              window.alert(
                "Hinweis: Dies ist bereits die 3. Verwarnung für dieses Mitglied.",
              );
            }
          } catch (err) {
            window.alert(
              err instanceof Error ? err.message : "Verwarnung fehlgeschlagen.",
            );
          } finally {
            setPending(false);
          }
        })();
      }}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50"
      aria-label="Verwarnung"
      title="Verwarnung"
    >
      <AlertTriangle className="h-4 w-4" />
    </button>
  );
}

export function AdminLiveSessionQuestions({
  sessionId,
  initialCount,
  disabled,
}: {
  sessionId: string;
  initialCount: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<AdminLiveQuestionRow[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const result = await listLiveSessionQuestionsAction(sessionId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setQuestions(result.questions);
    setCount(result.questions.length);
    setLoaded(true);
  }, [sessionId]);

  useEffect(() => {
    if (!open || loaded) return;
    void load();
  }, [open, loaded, load]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  function toggle() {
    if (disabled) return;
    setOpen((v) => !v);
  }

  function remove(id: string) {
    if (!window.confirm("Frage endgültig löschen?")) return;
    startTransition(async () => {
      const result = await removeLiveSessionQuestionAdminAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setCount((c) => Math.max(0, c - 1));
    });
  }

  function dismiss(id: string) {
    startTransition(async () => {
      const result = await dismissLiveSessionQuestionAdminAction(sessionId, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setCount((c) => Math.max(0, c - 1));
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-fc-navy/10 bg-slate-50/80">
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-fc-navy hover:bg-white/60 disabled:opacity-50"
      >
        <span>
          Offene Fragen{" "}
          <span className="tabular-nums text-slate-500">({count})</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        )}
      </button>

      {open ? (
        <div className="border-t border-fc-navy/10 bg-white px-3 py-3">
          {error ? <p className="mb-2 text-sm text-rose-700">{error}</p> : null}
          {!loaded && !error ? (
            <p className="text-sm text-slate-500">Lade Fragen…</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-slate-500">Keine offenen Fragen.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-fc-navy/5 overflow-y-auto overscroll-contain rounded-lg border border-fc-navy/10">
              {questions.map((q, i) => (
                <li
                  key={q.id}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2.5",
                    i % 2 === 0 ? "bg-white" : "bg-fc-ice/70",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <MemberProfileAnchor
                        userId={q.authorId}
                        className="truncate text-xs font-semibold text-fc-navy hover:underline"
                      >
                        {q.authorName}
                      </MemberProfileAnchor>
                      <time
                        className="shrink-0 text-[10px] tabular-nums text-slate-400"
                        dateTime={q.createdAt}
                      >
                        {formatChatTime(q.createdAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-700">{q.body}</p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => dismiss(q.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    title="Abhaken (wie bei Anni)"
                    aria-label="Frage abhaken"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <QuestionWarnButton questionId={q.id} onRemoved={() => remove(q.id)} />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(q.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    title="Endgültig löschen"
                    aria-label="Frage löschen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setLoaded(false);
                void load();
              }}
              className="text-xs font-medium text-fc-blue hover:underline disabled:opacity-60"
            >
              Aktualisieren
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
