"use client";

import { useEffect, useState, useTransition } from "react";
import { Wallet } from "lucide-react";
import { formatEur } from "@/lib/club/ledger";
import { PaymentMethodPicker } from "@/components/payments/payment-method-picker";
import { PaymentConfirmation } from "@/components/payments/payment-confirmation";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments/labels";
import type { PaymentCheckoutResult, PaymentMethod, PaymentSettingsRow } from "@/lib/payments/types";

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
}: {
  applicationId: string;
  paymentToken: string;
  feeCents: number;
  applicantFirstName?: string | null;
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

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <Wallet className="h-4 w-4" />
        Mitgliedsbeitrag bezahlen
      </div>
      <p className="mt-2 text-sm text-amber-950">
        {applicantFirstName ? `${applicantFirstName}, ` : ""}
        der Jahresbeitrag beträgt{" "}
        <strong>{formatEur(feeCents)}</strong>. Wähle eine Zahlungsart — der Betrag wird zunächst
        als offener Posten erfasst und vom Vorstand bestätigt.
      </p>

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
