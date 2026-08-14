"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MEMBER_INTRO_QUESTIONS,
  INTRO_ANSWER_MAX_LENGTH,
  SHORT_BIO_LABEL_ME,
  SHORT_BIO_MAX_LENGTH,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";
import {
  introProgressFromAnswers,
  introProgressLabel,
  STECKBRIEF_BONUS_POINTS,
} from "@/lib/members/intro-progress";
import {
  ensureSteckbriefBonusAction,
  saveMyIntroAnswers,
} from "@/app/(app)/mitglieder/intro-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export function ProfileIntroSection({
  userId,
  onSaved,
}: {
  userId: string;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [bonusReceived, setBonusReceived] = useState(false);
  const [shortBio, setShortBio] = useState("");
  const [answers, setAnswers] = useState<Record<MemberIntroKey, string>>({
    intro_discovered_anni: "",
    intro_favorite_song: "",
    intro_other_artists: "",
    intro_hobbies: "",
    intro_perfect_concert: "",
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const [{ data }, { data: bonusRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "short_bio,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert",
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("points_transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("reason", "profile_intro_complete")
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (data) {
        setShortBio((data.short_bio ?? "").slice(0, SHORT_BIO_MAX_LENGTH));
        setAnswers({
          intro_discovered_anni: (data.intro_discovered_anni ?? "").slice(0, INTRO_ANSWER_MAX_LENGTH),
          intro_favorite_song: (data.intro_favorite_song ?? "").slice(0, INTRO_ANSWER_MAX_LENGTH),
          intro_other_artists: (data.intro_other_artists ?? "").slice(0, INTRO_ANSWER_MAX_LENGTH),
          intro_hobbies: (data.intro_hobbies ?? "").slice(0, INTRO_ANSWER_MAX_LENGTH),
          intro_perfect_concert: (data.intro_perfect_concert ?? "").slice(
            0,
            INTRO_ANSWER_MAX_LENGTH,
          ),
        });
      }
      const hadBonus = Boolean(bonusRow);
      setBonusReceived(hadBonus);
      setLoaded(true);

      if (!hadBonus && data) {
        const complete = introProgressFromAnswers({
          short_bio: data.short_bio ?? "",
          intro_discovered_anni: data.intro_discovered_anni ?? "",
          intro_favorite_song: data.intro_favorite_song ?? "",
          intro_other_artists: data.intro_other_artists ?? "",
          intro_hobbies: data.intro_hobbies ?? "",
          intro_perfect_concert: data.intro_perfect_concert ?? "",
        }).isComplete;
        if (complete) {
          const claim = await ensureSteckbriefBonusAction();
          if (cancelled) return;
          if (claim.ok && claim.bonusAwarded) {
            setBonusReceived(true);
            setMessage(
              `Steckbrief vollständig — du hast ${STECKBRIEF_BONUS_POINTS} Anni-Stars erhalten!`,
            );
            onSaved?.();
          } else if (claim.ok) {
            setBonusReceived(true);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const progress = useMemo(
    () =>
      introProgressFromAnswers({
        short_bio: shortBio,
        ...answers,
      }),
    [shortBio, answers],
  );

  function onSave() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveMyIntroAnswers({
        ...answers,
        short_bio: shortBio,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.bonusAwarded) {
        setBonusReceived(true);
        setMessage(
          `Steckbrief vollständig — du hast ${STECKBRIEF_BONUS_POINTS} Anni-Stars erhalten!`,
        );
        onSaved?.();
        return;
      }
      if (result.introComplete) {
        setMessage("Steckbrief vollständig — danke!");
        onSaved?.();
        return;
      }
      setMessage("Kennenlernen gespeichert.");
      onSaved?.();
    });
  }

  return (
    <Card id="kennenlernen" className="scroll-mt-24">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-fc-navy">Kennenlernen</h2>
              <span className="text-xs font-semibold tabular-nums text-slate-500">
                {introProgressLabel(progress)} ausgefüllt
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              Für dein öffentliches Mitglieder-Portal.{" "}
              <Link href={`/mitglieder/${userId}`} className="font-medium text-fc-blue hover:underline">
                Portal ansehen
              </Link>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-2">
        {!progress.isComplete ? (
          <div className="rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-rose-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-amber-950">
              Steckbrief noch nicht vollständig
            </p>
            <p className="mt-1 text-sm text-amber-900/90">
              Fülle alle {progress.total} Felder aus — dann erhältst du einmalig{" "}
              {STECKBRIEF_BONUS_POINTS} Anni-Stars.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fc-navy to-fc-blue transition-all duration-300"
                style={{ width: `${Math.round((progress.filled / progress.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : bonusReceived ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Steckbrief vollständig — Bonus von {STECKBRIEF_BONUS_POINTS} Anni-Stars erhalten.
          </div>
        ) : null}

        {!loaded ? (
          <p className="text-sm text-slate-500">Lade…</p>
        ) : (
          <>
            <label className="grid gap-1">
              <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700">
                <span>{SHORT_BIO_LABEL_ME}</span>
                <span className="text-xs font-normal tabular-nums text-slate-400">
                  {shortBio.length}/{SHORT_BIO_MAX_LENGTH}
                </span>
              </span>
              <textarea
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value.slice(0, SHORT_BIO_MAX_LENGTH))}
                rows={2}
                maxLength={SHORT_BIO_MAX_LENGTH}
                placeholder="Max. 150 Zeichen …"
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              />
            </label>
            {MEMBER_INTRO_QUESTIONS.map((q) => (
              <label key={q.key} className="grid gap-1">
                <span className="flex items-start justify-between gap-2 text-sm font-medium text-slate-700">
                  <span className="min-w-0 flex-1 break-words leading-snug">{q.label}</span>
                  <span
                    className={cn(
                      "shrink-0 pt-0.5 text-xs font-normal tabular-nums",
                      answers[q.key].length >= INTRO_ANSWER_MAX_LENGTH
                        ? "text-amber-700"
                        : "text-slate-400",
                    )}
                  >
                    {answers[q.key].length}/{INTRO_ANSWER_MAX_LENGTH}
                  </span>
                </span>
                <textarea
                  value={answers[q.key]}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.key]: e.target.value.slice(0, INTRO_ANSWER_MAX_LENGTH),
                    }))
                  }
                  rows={3}
                  maxLength={INTRO_ANSWER_MAX_LENGTH}
                  placeholder={`Optional, max. ${INTRO_ANSWER_MAX_LENGTH} Zeichen …`}
                  className={cn(
                    "w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm leading-snug outline-none focus:ring-4 focus:ring-[color:var(--ring)]",
                    !answers[q.key].trim() && progress.filled < progress.total && "border-amber-200",
                  )}
                />
              </label>
            ))}
          </>
        )}
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        <button
          type="button"
          disabled={pending || !loaded}
          onClick={onSave}
          className="h-10 w-fit rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
        >
          {pending ? "Speichere…" : "Antworten speichern"}
        </button>
      </CardContent>
    </Card>
  );
}
