"use client";

import { useTransition } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import {
  dismissLiveSessionQuestionAdminAction,
  removeLiveSessionQuestionAdminAction,
} from "@/app/(app)/admin/live/actions";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { useRouter } from "next/navigation";

export function AdminLiveQuestionActions({
  sessionId,
  questionId,
}: {
  sessionId: string;
  questionId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function dismiss() {
    startTransition(async () => {
      const result = await dismissLiveSessionQuestionAdminAction(sessionId, questionId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      refresh();
    });
  }

  function remove() {
    if (!window.confirm("Frage endgültig löschen?")) return;
    startTransition(async () => {
      const result = await removeLiveSessionQuestionAdminAction(questionId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      refresh();
    });
  }

  function warn() {
    const warnOk = window.confirm(
      "Verwarnung aussprechen und automatische E-Mail an das Mitglied senden?",
    );
    if (!warnOk) return;
    const deleteOk = window.confirm(
      "Frage zusätzlich löschen?\n\nOK = löschen + verwarnen\nAbbrechen = nur verwarnen (bleibt stehen)",
    );
    startTransition(async () => {
      try {
        const result = await issueCommentWarning({
          commentType: "live_question",
          commentId: questionId,
          deleteComment: deleteOk,
        });
        if (result.isThirdWarning) {
          window.alert("Hinweis: Dies ist bereits die 3. Verwarnung für dieses Mitglied.");
        }
        refresh();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Verwarnung fehlgeschlagen.");
      }
    });
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={dismiss}
        className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        title="Abhaken (wie bei Anni)"
        aria-label="Frage abhaken"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={warn}
        className="grid h-8 w-8 place-items-center rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50"
        title="Verwarnung"
        aria-label="Verwarnung"
      >
        <AlertTriangle className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={remove}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
        title="Endgültig löschen"
        aria-label="Frage löschen"
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  );
}
