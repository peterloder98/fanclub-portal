import { AdminLiveQuestionActions } from "@/components/admin/admin-live-question-actions.client";
import { MemberProfileAnchor } from "@/components/members/member-profile-anchor";
import { formatChatTime } from "@/lib/chat/types";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";
import type { AdminLiveQuestionRow } from "@/lib/live/admin-questions";
import type { LiveSessionRow } from "@/lib/live/types";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<LiveSessionRow["status"], string> = {
  scheduled: "Geplant",
  live: "Live",
  ended: "Beendet",
  cancelled: "Abgesagt",
};

export function AdminLiveQuestionsPanel({
  sessions,
  questionsBySessionId,
}: {
  sessions: LiveSessionRow[];
  questionsBySessionId: Record<string, AdminLiveQuestionRow[]>;
}) {
  const active = sessions.filter((s) => s.status !== "cancelled");
  if (!active.length) return null;

  return (
    <section className="mb-8 grid gap-4">
      <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-white px-4 py-4">
        <h2 className="text-base font-semibold text-fc-navy">Fan-Fragen moderieren</h2>
        <p className="mt-1 text-sm text-slate-700">
          Alle offenen Vorab- und Live-Fragen — hier abhaken, löschen oder mit Verwarnung entfernen.
          Anni sieht dieselben Fragen in ihrem Host-Link.
        </p>
      </div>

      {active.map((session) => {
        const questions = questionsBySessionId[session.id] ?? [];
        return (
          <article
            key={session.id}
            className="overflow-hidden rounded-2xl border-2 border-fc-navy/15 bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-fc-navy/10 bg-fc-ice/40 px-4 py-3">
              <div>
                <h3 className="font-semibold text-fc-navy">{session.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Start {formatBerlinDateTime(session.starts_at)} ·{" "}
                  {STATUS_LABEL[session.status]}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold tabular-nums",
                  questions.length > 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                {questions.length} offen
              </span>
            </header>

            {questions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">Noch keine offenen Fragen.</p>
            ) : (
              <ul className="divide-y divide-fc-navy/5">
                {questions.map((q, i) => (
                  <li
                    key={q.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3",
                      i % 2 === 0 ? "bg-white" : "bg-fc-ice/50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <MemberProfileAnchor
                          userId={q.authorId}
                          className="text-xs font-semibold text-fc-navy hover:underline"
                        >
                          {q.authorName}
                        </MemberProfileAnchor>
                        <time
                          className="text-[10px] tabular-nums text-slate-400"
                          dateTime={q.createdAt}
                        >
                          {formatChatTime(q.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-slate-800">{q.body}</p>
                    </div>
                    <AdminLiveQuestionActions sessionId={session.id} questionId={q.id} />
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
