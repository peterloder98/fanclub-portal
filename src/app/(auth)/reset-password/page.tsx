"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  completePasswordReset,
  getClaimedPasswordResetSession,
  redeemPasswordResetToken,
} from "@/app/(auth)/reset-password/actions";
import { mapAuthErrorMessage } from "@/lib/auth/map-auth-error";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initOnce = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initOnce.current) return;
    initOnce.current = true;

    async function resumeFromClaim(): Promise<boolean> {
      const claimed = await getClaimedPasswordResetSession();
      if (claimed.ok) {
        setEmail(claimed.email);
        return true;
      }
      return false;
    }

    async function init() {
      try {
        const supabase = createSupabaseBrowserClient();
        const setupToken = searchParams.get("setup_token");

        if (setupToken) {
          const redeemed = await redeemPasswordResetToken(setupToken);
          if (redeemed.ok) {
            await supabase.auth.signOut().catch(() => null);
            setEmail(redeemed.email);
            router.replace("/reset-password", { scroll: false });
            setSessionReady(true);
            return;
          }
          if (await resumeFromClaim()) {
            router.replace("/reset-password", { scroll: false });
            setSessionReady(true);
            return;
          }
          setSessionError(redeemed.error);
          setSessionReady(true);
          return;
        }

        if (await resumeFromClaim()) {
          setSessionReady(true);
          return;
        }

        setSessionError(
          "Kein gültiger Reset-Link. Bitte den Button in der neuesten E-Mail nutzen oder unter „Passwort vergessen“ einen neuen Link anfordern.",
        );
        setSessionReady(true);
      } catch {
        setSessionError("Sitzung konnte nicht geladen werden.");
        setSessionReady(true);
      }
    }
    void init();
  }, [router, searchParams]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completePasswordReset({
        password,
        passwordConfirm,
      });
      if (!result.ok) {
        setError(mapAuthErrorMessage(result.error));
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login?reset=1");
      router.refresh();
    });
  }

  return (
    <Card className="w-full overflow-hidden border-fc-navy/15 shadow-lg shadow-fc-navy/10">
      <div className="bg-gradient-to-r from-fc-navy to-fc-blue px-5 py-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
          Anni Perka Fanclub
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">
          Neues Passwort setzen
        </h1>
        <p className="mt-1 text-sm text-white/85">
          Nur Passwort ändern — keine erneute Registrierung
        </p>
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-base text-fc-navy">
          <KeyRound className="h-4 w-4 text-fc-blue" aria-hidden />
          Passwort zurücksetzen
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!sessionReady ? (
          <p className="text-sm text-slate-600">Sitzung wird geprüft…</p>
        ) : sessionError ? (
          <div className="grid gap-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {sessionError}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
              <Link href="/forgot-password" className="text-fc-blue hover:underline">
                Passwort vergessen / neuen Link anfordern
              </Link>
              <Link href="/login" className="text-slate-600 hover:underline">
                Zum Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="rounded-xl border border-fc-ice bg-fc-mist/60 px-3 py-2 text-sm text-slate-700">
              <p className="font-medium text-fc-navy">Dein Benutzername</p>
              <p className="mt-0.5 break-all tabular-nums">{email ?? "—"}</p>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">Neues Passwort *</span>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
                />
              </div>
              <span className="text-xs text-slate-500">Mindestens 8 Zeichen</span>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-slate-700">
                Passwort wiederholen *
              </span>
              <input
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
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
              className="h-11 rounded-xl bg-fc-navy text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-fc-blue disabled:opacity-60"
            >
              {pending ? "Speichere…" : "Passwort speichern & zum Login"}
            </button>

            <p className="text-xs leading-relaxed text-slate-500">
              Nach dem Speichern wirst du zum Login weitergeleitet. Dort meldest du dich mit
              E-Mail und dem neuen Passwort an.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Lade…</p>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
