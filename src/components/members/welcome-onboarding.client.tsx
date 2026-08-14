"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ScrollText, Sparkles } from "lucide-react";
import { acceptCommunityRules } from "@/app/(app)/community-rules/actions";
import {
  dismissIntroOnboarding,
  saveMyIntroAnswers,
} from "@/app/(app)/mitglieder/intro-actions";
import { CommunityRulesContent } from "@/components/community/community-rules-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MEMBER_INTRO_QUESTIONS,
  INTRO_ANSWER_MAX_LENGTH,
  SHORT_BIO_LABEL_YOU,
  SHORT_BIO_MAX_LENGTH,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";
import { COMMUNITY_RULES_ACCEPTANCE_LABEL } from "@/lib/community/rules";

type Step = "rules" | "intro" | "done";

function allowLeaveWelcomeOnce() {
  try {
    sessionStorage.setItem("fc-welcome-preview-exit", String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function WelcomeOnboardingClient({
  needsRulesAcceptance,
  needsIntroOnboarding,
  preview = false,
}: {
  needsRulesAcceptance: boolean;
  needsIntroOnboarding: boolean;
  /** Admin-Vorschau: Schritte durchspielen ohne Speichern */
  preview?: boolean;
}) {
  const [step, setStep] = useState<Step>(needsRulesAcceptance ? "rules" : "intro");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rulesChecked, setRulesChecked] = useState(false);
  const [shortBio, setShortBio] = useState("");
  const [answers, setAnswers] = useState<Record<MemberIntroKey, string>>({
    intro_discovered_anni: "",
    intro_favorite_song: "",
    intro_other_artists: "",
    intro_hobbies: "",
    intro_perfect_concert: "",
  });

  function setField(key: MemberIntroKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  /** Harte Navigation, damit das Layout den Onboarding-Status neu lädt. */
  function finish(path = "/dashboard") {
    window.location.assign(path);
  }

  function onAcceptRules() {
    if (!rulesChecked) return;
    setError(null);
    if (preview) {
      if (needsIntroOnboarding) {
        setStep("intro");
        return;
      }
      setStep("done");
      return;
    }
    startTransition(async () => {
      const result = await acceptCommunityRules();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (needsIntroOnboarding) {
        setStep("intro");
        return;
      }
      finish();
    });
  }

  function onSaveIntro() {
    setError(null);
    if (preview) {
      setStep("done");
      return;
    }
    startTransition(async () => {
      const result = await saveMyIntroAnswers({
        ...answers,
        short_bio: shortBio,
        dismissOnboarding: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      finish();
    });
  }

  function onSkipIntro() {
    setError(null);
    if (preview) {
      setStep("done");
      return;
    }
    startTransition(async () => {
      const result = await dismissIntroOnboarding();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      finish();
    });
  }

  const previewBanner = preview ? (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
      <strong>Vorschau:</strong> So sieht der Willkommen-Flow für neue Mitglieder aus. Nichts wird
      gespeichert.{" "}
      <Link href="/admin" className="font-semibold underline" onClick={allowLeaveWelcomeOnce}>
        Zurück zum Admin
      </Link>
    </div>
  ) : null;

  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-50/80">
        {previewBanner}
        <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8">
          <Card className="overflow-hidden border-fc-navy/15 shadow-lg shadow-fc-navy/10">
            <div className="bg-gradient-to-r from-fc-navy to-fc-blue px-5 py-4 text-white">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Fertig
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight">Vorschau beendet</h1>
              <p className="mt-1 text-sm text-white/85">
                So endet der Flow für neue Mitglieder — danach öffnet sich die App (Dashboard).
              </p>
            </div>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm text-slate-600">
                Es wurde nichts gespeichert. Du kannst die Vorschau jederzeit erneut öffnen.
              </p>
              <div className="flex justify-end">
                <Link
                  href="/admin"
                  onClick={allowLeaveWelcomeOnce}
                  className="inline-flex h-11 items-center rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white hover:bg-fc-blue"
                >
                  Zurück zum Admin
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (step === "rules") {
    return (
      <div className="min-h-screen bg-slate-50/80">
        {previewBanner}
        <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8">
          <Card className="overflow-hidden border-fc-navy/15 shadow-lg shadow-fc-navy/10">
            <div className="bg-gradient-to-r from-fc-navy to-fc-blue px-5 py-4 text-white">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
                <ScrollText className="h-3.5 w-3.5" aria-hidden />
                Schritt 1 von {needsIntroOnboarding ? "2" : "1"}
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight">Fanclub-Regeln</h1>
              <p className="mt-1 text-sm text-white/85">
                Sachlich, fair und mit Blick auf ein gutes Miteinander — in der App und in der
                WhatsApp-Gruppe.
              </p>
            </div>
            <CardContent className="space-y-5 pt-5">
              <CommunityRulesContent compact />

              <p className="text-xs text-slate-500">
                Die Regeln findest du später jederzeit unter Fanclub-Regeln in der App.
              </p>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:gap-4">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rulesChecked}
                    onChange={(e) => setRulesChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-fc-navy focus:ring-fc-blue"
                  />
                  <span className="text-sm leading-relaxed text-slate-700">
                    {COMMUNITY_RULES_ACCEPTANCE_LABEL}
                  </span>
                </label>
                <button
                  type="button"
                  disabled={pending || !rulesChecked}
                  onClick={onAcceptRules}
                  className="h-11 shrink-0 rounded-xl bg-fc-navy px-5 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-50 sm:self-stretch sm:px-6"
                >
                  {pending
                    ? "Speichere…"
                    : needsIntroOnboarding
                      ? preview
                        ? "Weiter"
                        : "Zustimmen & weiter"
                      : preview
                        ? "Weiter"
                        : "Zustimmen & App starten"}
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80">
      {previewBanner}
      <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8">
        <Card className="overflow-hidden border-fc-navy/15 shadow-lg shadow-fc-navy/10">
          <div className="bg-gradient-to-r from-fc-navy to-fc-blue px-5 py-4 text-white">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Schritt 2 von 2
            </p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">Schön, dass du da bist!</h1>
            <p className="mt-1 text-sm text-white/85">
              Kurz vorstellen und fünf Fragen — alles freiwillig. Du kannst überspringen und später
              im Profil nachtragen.
            </p>
          </div>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base text-fc-navy">Kennenlernen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700">
                <span>{SHORT_BIO_LABEL_YOU}</span>
                <span className="text-xs font-normal tabular-nums text-slate-400">
                  {shortBio.length}/{SHORT_BIO_MAX_LENGTH}
                </span>
              </span>
              <textarea
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value.slice(0, SHORT_BIO_MAX_LENGTH))}
                rows={2}
                maxLength={SHORT_BIO_MAX_LENGTH}
                placeholder="Optional, max. 150 Zeichen …"
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
              />
            </label>

            {MEMBER_INTRO_QUESTIONS.map((q) => (
              <label key={q.key} className="grid gap-1.5">
                <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700">
                  <span>{q.label}</span>
                  <span
                    className={`shrink-0 text-xs font-normal tabular-nums ${
                      answers[q.key].length >= INTRO_ANSWER_MAX_LENGTH
                        ? "text-amber-700"
                        : "text-slate-400"
                    }`}
                  >
                    {answers[q.key].length}/{INTRO_ANSWER_MAX_LENGTH}
                  </span>
                </span>
                <textarea
                  value={answers[q.key]}
                  onChange={(e) => setField(q.key, e.target.value.slice(0, INTRO_ANSWER_MAX_LENGTH))}
                  rows={3}
                  maxLength={INTRO_ANSWER_MAX_LENGTH}
                  placeholder={`Optional, max. ${INTRO_ANSWER_MAX_LENGTH} Zeichen …`}
                  className="w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm leading-snug outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </label>
            ))}

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={onSkipIntro}
                className="h-11 rounded-xl border bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Später im Profil
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onSaveIntro}
                className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
              >
                {pending ? "Speichere…" : preview ? "Weiter" : "Speichern & weiter"}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
