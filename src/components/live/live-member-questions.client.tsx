"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteLiveSessionQuestion,
  submitLiveSessionQuestion,
} from "@/app/(app)/live/actions";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { LIVE_SESSION_QUESTION_MAX_LEN } from "@/lib/live/types";
import { formatChatTime } from "@/lib/chat/types";
import { profileDisplayName } from "@/lib/profiles/display";
import { cn } from "@/lib/cn";
import { MemberProfileAnchor } from "@/components/members/member-profile-anchor";

type QItem = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

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
      onClick={(e) => {
        e.stopPropagation();
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
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50"
      aria-label="Verwarnung"
      title="Verwarnung"
    >
      <AlertTriangle className="h-3.5 w-3.5" />
    </button>
  );
}

export function LiveMemberQuestions({
  sessionId,
  enabled,
  mode = "live",
}: {
  sessionId: string;
  enabled: boolean;
  /** advance = vor dem Live nur eine Frage; live = während der Session (weiterhin max. 1 offen). */
  mode?: "advance" | "live";
}) {
  const [draft, setDraft] = useState("");
  const [mine, setMine] = useState<QItem[]>([]);
  const [openAll, setOpenAll] = useState<QItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function reload(uid: string, admin: boolean) {
    const supabase = createSupabaseBrowserClient();
    const { data: mineRows } = await supabase
      .from("live_session_questions")
      .select("id,body,created_at,author_id")
      .eq("session_id", sessionId)
      .eq("author_id", uid)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    setMine(
      (mineRows ?? []).map((q) => ({
        id: q.id,
        body: q.body,
        createdAt: q.created_at,
        authorId: q.author_id,
        authorName: "Du",
      })),
    );

    if (admin) {
      const { data: all } = await supabase
        .from("live_session_questions")
        .select("id,body,created_at,author_id")
        .eq("session_id", sessionId)
        .is("dismissed_at", null)
        .order("created_at", { ascending: true })
        .limit(100);

      const rows = all ?? [];
      const ids = [...new Set(rows.map((r) => r.author_id))];
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("id,first_name,last_name,email")
            .in("id", ids)
        : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> };
      const nameById = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          profileDisplayName({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
          }),
        ]),
      );
      setOpenAll(
        rows.map((q) => ({
          id: q.id,
          body: q.body,
          createdAt: q.created_at,
          authorId: q.author_id,
          authorName: nameById.get(q.author_id) ?? "Mitglied",
        })),
      );
    }
  }

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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const admin = profile?.role === "admin";
      setIsAdmin(admin);
      await reload(user.id, admin);
    })();

    const channel = supabase
      .channel(`live-session-questions:${sessionId}`)
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
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .maybeSingle();
            await reload(user.id, profile?.role === "admin");
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
      setOkMsg(
        mode === "advance"
          ? "Vorab-Frage gespeichert. Weitere Fragen könnt ihr während des Live-Chats stellen."
          : "Frage gesendet — Anni sieht sie in ihrer Liste.",
      );
      if (userId) await reload(userId, isAdmin);
    });
  }

  async function removeQuestion(id: string) {
    setOpenAll((prev) => prev.filter((q) => q.id !== id));
    setMine((prev) => prev.filter((q) => q.id !== id));
    const result = await deleteLiveSessionQuestion(id);
    if (!result.ok) setError(result.error);
  }

  if (!enabled) return null;

  const hasOpenQuestion = mine.length > 0;
  const canSubmit = !hasOpenQuestion;

  return (
    <section className="overflow-hidden rounded-2xl border border-fc-navy/15 bg-white shadow-sm">
      <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-2.5 text-white">
        <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <HelpCircle className="h-4 w-4" aria-hidden />
          {mode === "advance" ? "Vorab-Frage an Anni" : "Frage an Anni"}
        </p>
        <p className="text-[11px] text-white/80">
          {mode === "advance"
            ? "Optional — eine Frage vor dem Live. Weitere Fragen später im Chat."
            : "Pro Person eine offene Frage. Anni sieht sie chronologisch."}
        </p>
      </header>

      <div className="grid gap-4 p-4">
        {canSubmit ? (
          <form onSubmit={onSubmit} className="grid gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, LIVE_SESSION_QUESTION_MAX_LEN))}
              rows={2}
              maxLength={LIVE_SESSION_QUESTION_MAX_LEN}
              placeholder="Deine Frage…"
              className="w-full rounded-xl border border-fc-navy/15 bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
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
                {pending ? "Sende…" : mode === "advance" ? "Frage einreichen" : "Frage senden"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-fc-navy/10 bg-fc-ice/60 px-3 py-3 text-sm text-slate-700">
            {mode === "advance" ? (
              <p>
                Deine Vorab-Frage ist eingereicht — das Feld ist geschlossen.{" "}
                <strong>Weitere Fragen könnt ihr während des Live-Chats stellen.</strong>
              </p>
            ) : (
              <p>Du hast bereits eine offene Frage. Mehr als eine ist nicht möglich.</p>
            )}
          </div>
        )}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {okMsg ? <p className="text-sm text-emerald-700">{okMsg}</p> : null}

        {userId && mine.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Deine Frage
            </p>
            <ul className="max-h-[16.5rem] space-y-0 overflow-y-auto overscroll-contain rounded-xl border border-fc-navy/10 divide-y divide-fc-navy/5">
              {mine.map((q, i) => (
                <li
                  key={q.id}
                  className={cn("px-3 py-2.5 text-sm", i % 2 === 0 ? "bg-white" : "bg-fc-ice/70")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fc-navy">Du</span>
                    <time className="text-[10px] tabular-nums text-slate-400" dateTime={q.createdAt}>
                      {formatChatTime(q.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-700">{q.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isAdmin ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Offene Fragen (Admin) · älteste zuerst
            </p>
            <ul className="max-h-[16.5rem] overflow-y-auto overscroll-contain rounded-xl border border-fc-navy/10 divide-y divide-fc-navy/5">
              {openAll.length === 0 ? (
                <li className="px-3 py-4 text-sm text-slate-500">Keine offenen Fragen.</li>
              ) : (
                openAll.map((q, i) => (
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
                    <QuestionWarnButton
                      questionId={q.id}
                      onRemoved={() => void removeQuestion(q.id)}
                    />
                    <button
                      type="button"
                      onClick={() => void removeQuestion(q.id)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Frage löschen"
                      title="Löschen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
