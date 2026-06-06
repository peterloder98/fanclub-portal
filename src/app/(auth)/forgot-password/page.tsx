"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (resetError) throw resetError;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Versand");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Passwort zurücksetzen</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="neutral">E-Mail</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="rounded-xl border bg-white px-3 py-3">
              Wenn die E-Mail existiert, wurde ein Link gesendet.
            </div>
            <Link href="/login" className="text-slate-700 hover:underline">
              Zurück zum Login
            </Link>
          </div>
        ) : (
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
              {busy ? "Sende…" : "Link senden"}
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

