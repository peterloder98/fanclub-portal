"use client";

import { useEffect, useState, useTransition } from "react";
import { Wallet } from "lucide-react";
import { formatEur } from "@/lib/club/ledger";
import { PaymentMethodPicker } from "@/components/payments/payment-method-picker";
import { PaymentConfirmation } from "@/components/payments/payment-confirmation";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments/labels";
import type { PaymentCheckoutResult, PaymentMethod, PaymentSettingsRow } from "@/lib/payments/types";
import { buildEmailSalutation } from "@/lib/email/salutation-block";
import { CLUB_BANK, formatClubIbanDisplay } from "@/lib/payments/club-bank";

function payButtonLabel(method: PaymentMethod | null, pending: boolean) {
  if (pending) return "Wird angelegt…";
  if (!method) return "Zahlung anlegen";
  if (method === "paypal") return "Mit PayPal bezahlen (Testmodus)";
  if (method === "stripe") return "Mit Stripe bezahlen (Testmodus)";
  return "Zahlung per Überweisung anlegen";
}

export function ApplicationPaymentCheckout({
  applicationId,
  paymentToken,
  feeCents,
  applicantFirstName,
  applicantGender,
}: {
  applicationId: string;
  paymentToken: string;
  feeCents: number;
  applicantFirstName?: string | null;
  applicantGender?: string | null;
}) {
  const [methods, setMethods] = useState<PaymentSettingsRow[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [result, setResult] = useState<PaymentCheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void fetch("/api/payments/methods")
      .then((r) => r.json())
      .then((json: { methods?: PaymentSettingsRow[] }) =>
        setMethods(
          (json.methods ?? []).map((m) => ({
            ...m,
            public_config_json: {},
          })),
        ),
      )
      .catch(() => setMethods([]));
  }, []);

  function pay() {
    if (!method) {
      setError("Bitte Zahlungsart wählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/membership/applications/${applicationId}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: paymentToken, paymentMethod: method }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string; payment?: PaymentCheckoutResult };
        if (!res.ok || !json.ok || !json.payment) {
          throw new Error(json.error ?? "Zahlung konnte nicht angelegt werden.");
        }
        setResult(json.payment);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Zahlung fehlgeschlagen");
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-3">
        <PaymentConfirmation result={result} />
        <p className="rounded-xl border border-blue-100 bg-fc-ice/60 px-3 py-2 text-xs text-blue-950">
          Dein Antrag ist eingegangen. Der Vorstand prüft die Zahlung manuell und schaltet deine
          Mitgliedschaft danach frei. Du erhältst eine E-Mail, sobald der Zugang aktiv ist.
        </p>
      </div>
    );
  }

  const salutation =
    applicantFirstName?.trim()
      ? buildEmailSalutation(applicantFirstName, applicantGender)
      : null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <Wallet className="h-4 w-4" />
        Mitgliedsbeitrag bezahlen
      </div>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-amber-950">
        <p>
          {salutation ? `${salutation},` : "Hallo,"} der Jahresbeitrag für den Anni Perka Fanclub
          beträgt <strong>{formatEur(feeCents)}</strong>.
        </p>
        <p>
          Wähle bitte eine Zahlungsart aus — der Beitrag wird erst nach Eingang vom Vorstand
          bestätigt.
        </p>
        <p>
          Unmittelbar danach erfolgt die aktive Aufnahme in den Fanclub sowie die Einladung in die
          Fanclub App.
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-amber-200/80 bg-white/70 px-3 py-3 text-sm text-slate-800">
        <p className="font-semibold text-fc-navy">Banküberweisung</p>
        <dl className="mt-2 grid gap-1 sm:grid-cols-[5.5rem_1fr]">
          <dt className="text-slate-500">Empfänger</dt>
          <dd className="font-medium">{CLUB_BANK.account_holder}</dd>
          <dt className="text-slate-500">IBAN</dt>
          <dd className="font-mono text-[13px]">{formatClubIbanDisplay()}</dd>
          <dt className="text-slate-500">BIC</dt>
          <dd className="font-mono text-[13px]">{CLUB_BANK.bic}</dd>
          <dt className="text-slate-500">VWZ</dt>
          <dd>{CLUB_BANK.reference_hint}</dd>
        </dl>
      </div>

      {methods.length ? (
        <div className="mt-4">
          <PaymentMethodPicker
            methods={methods}
            value={method}
            onChange={setMethod}
            disabled={pending}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-amber-800">
          Zahlungsarten werden geladen… (Migration 076/077 in Supabase ausführen, falls nichts
          erscheint.)
        </p>
      )}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}

      <button
        type="button"
        disabled={pending || !method}
        onClick={pay}
        className="mt-4 h-11 w-full rounded-xl bg-fc-navy text-sm font-bold text-white disabled:opacity-50"
      >
        {payButtonLabel(method, pending)}
      </button>

      {method ? (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Gewählt: {PAYMENT_METHOD_LABELS[method]}
        </p>
      ) : null}
    </div>
  );
}
