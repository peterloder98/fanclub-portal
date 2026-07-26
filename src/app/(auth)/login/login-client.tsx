"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(
    () => searchParams.get("next") ?? "/dashboard",
    [searchParams],
  );
  const setupDone = searchParams.get("setup") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full overflow-hidden border-fc-navy/10 shadow-lg shadow-fc-navy/10">
      <div className="bg-gradient-to-br from-fc-navy via-fc-navy to-fc-blue px-6 pb-6 pt-7 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/fanclub-logo.png"
          alt="Anni Perka offizieller Fanclub"
          width={72}
          height={72}
          className="mx-auto h-[72px] w-[72px] rounded-2xl object-cover shadow-lg shadow-black/25 ring-2 ring-white/25"
        />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
          Anni Perka Fanclub
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Willkommen zurück</h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-relaxed text-white/85">
          Schön, dass du da bist — melde dich an, um ins Mitgliederportal zu gelangen.
        </p>
      </div>

      <CardContent className="pt-5">
        {setupDone ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Zugang eingerichtet — bitte jetzt mit E-Mail und Passwort anmelden.
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">E-Mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Passwort</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue disabled:opacity-60"
          >
            {busy ? "Anmelden…" : "Anmelden"}
          </button>

          <div className="mt-3 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Noch kein Mitglied?{" "}
            <Link href="/mitgliedschaft" className="font-medium text-fc-blue hover:underline">
              Online-Antrag stellen →
            </Link>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-slate-700 hover:underline">
              Passwort vergessen?
            </Link>
            <Link href="/supabase-check" className="text-slate-500 hover:underline">
              Supabase Check
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
