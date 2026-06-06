"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Ensure recovery session is established
  useEffect(() => {
    async function init() {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.getSession();
      } catch {
        // ignore
      }
    }
    void init();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Setzen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Neues Passwort setzen</CardTitle>
      </CardHeader>
      <CardContent>
        {ok ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="rounded-xl border bg-white px-3 py-3">
              Passwort wurde geändert.
            </div>
            <Link href="/login" className="text-slate-700 hover:underline">
              Zum Login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">
                Neues Passwort
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
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
              {busy ? "Speichere…" : "Passwort speichern"}
            </button>

            <Link href="/login" className="text-sm text-slate-700 hover:underline">
              Zurück zum Login
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

