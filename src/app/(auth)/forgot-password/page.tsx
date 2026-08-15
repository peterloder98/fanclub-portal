"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requestForgotPasswordEmail } from "@/app/(auth)/forgot-password/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestForgotPasswordEmail(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDoneMessage(result.message);
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Passwort zurücksetzen</CardTitle>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="neutral">E-Mail</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Du erhältst einen Link per E-Mail. Wenn du schon registriert bist, setzt du nur ein
          neues Passwort — ohne erneute Anmeldung mit Geburtsdatum. Der Link bleibt gültig, bis
          du das Passwort gespeichert hast (auch auf anderen Geräten). Nutze die neueste Mail.
        </p>
      </CardHeader>
      <CardContent>
        {doneMessage ? (
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="rounded-xl border bg-white px-3 py-3">{doneMessage}</div>
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
              disabled={pending}
              className="mt-1 h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue disabled:opacity-60"
            >
              {pending ? "Sende…" : "Link senden"}
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
