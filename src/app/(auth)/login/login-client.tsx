"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(
    () => searchParams.get("next") ?? "/dashboard",
    [searchParams],
  );

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Login</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="brand">Fanclub Portal</Badge>
          <Badge variant="neutral">Supabase Auth</Badge>
        </div>
      </CardHeader>
      <CardContent>
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
            className="mt-1 h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Anmelden…" : "Anmelden"}
          </button>

          <div className="mt-3 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Noch kein Mitglied?{" "}
            <Link href="/mitgliedschaft" className="font-medium text-blue-600 hover:underline">
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

