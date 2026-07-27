"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Topbar } from "@/components/app-shell/topbar";
import {
  MEMBER_INTRO_QUESTIONS,
  SHORT_BIO_LABEL_YOU,
  SHORT_BIO_MAX_LENGTH,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";
import {
  dismissIntroOnboarding,
  saveMyIntroAnswers,
} from "@/app/(app)/mitglieder/intro-actions";

export function MemberIntroOnboardingClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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

  function finish(path = "/dashboard") {
    router.replace(path);
    router.refresh();
  }

  function onSave() {
    setError(null);
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

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const result = await dismissIntroOnboarding();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      finish();
    });
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Willkommen" subtitle="Erzähl uns ein bisschen von dir — völlig freiwillig." />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8">
        <Card className="overflow-hidden border-fc-navy/15 shadow-lg shadow-fc-navy/10">
          <div className="bg-gradient-to-r from-fc-navy to-fc-blue px-5 py-4 text-white">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Mitglieder-Portal
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
                <span className="text-sm font-medium text-slate-700">{q.label}</span>
                <textarea
                  value={answers[q.key]}
                  onChange={(e) => setField(q.key, e.target.value)}
                  rows={2}
                  maxLength={800}
                  placeholder="Optional …"
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
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
                onClick={onSkip}
                className="h-11 rounded-xl border bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Später im Profil
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onSave}
                className="h-11 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white hover:bg-fc-blue disabled:opacity-60"
              >
                {pending ? "Speichere…" : "Speichern & weiter"}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
