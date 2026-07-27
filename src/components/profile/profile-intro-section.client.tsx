"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MEMBER_INTRO_QUESTIONS,
  SHORT_BIO_LABEL_ME,
  SHORT_BIO_MAX_LENGTH,
  type MemberIntroKey,
} from "@/lib/members/intro-questions";
import { saveMyIntroAnswers } from "@/app/(app)/mitglieder/intro-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ProfileIntroSection({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
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
      const { data } = await supabase
        .from("profiles")
        .select(
          "short_bio,intro_discovered_anni,intro_favorite_song,intro_other_artists,intro_hobbies,intro_perfect_concert",
        )
        .eq("id", userId)
        .maybeSingle();
      if (cancelled || !data) {
        setLoaded(true);
        return;
      }
      setShortBio(data.short_bio ?? "");
      setAnswers({
        intro_discovered_anni: data.intro_discovered_anni ?? "",
        intro_favorite_song: data.intro_favorite_song ?? "",
        intro_other_artists: data.intro_other_artists ?? "",
        intro_hobbies: data.intro_hobbies ?? "",
        intro_perfect_concert: data.intro_perfect_concert ?? "",
      });
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
      setMessage("Kennenlernen-Antworten gespeichert.");
    });
  }

  return (
    <Card id="kennenlernen" className="scroll-mt-24">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fc-navy">Kennenlernen</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Freiwillige Angaben für dein öffentliches Mitglieder-Portal.{" "}
              <Link href={`/mitglieder/${userId}`} className="font-medium text-fc-blue hover:underline">
                Portal ansehen
              </Link>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-2">
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
                <span className="text-sm font-medium text-slate-700">{q.label}</span>
                <textarea
                  value={answers[q.key]}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                  }
                  rows={2}
                  maxLength={800}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
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
