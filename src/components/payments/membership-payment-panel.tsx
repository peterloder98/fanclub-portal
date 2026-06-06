"use client";

import { useEffect, useState, useTransition } from "react";
import { Wallet } from "lucide-react";
import { formatEur } from "@/lib/club/ledger";
import { PaymentMethodPicker } from "@/components/payments/payment-method-picker";
import { PaymentConfirmation } from "@/components/payments/payment-confirmation";
import {
  initiateMembershipPaymentAction,
  listPaymentMethodsAction,
} from "@/app/(app)/payments/actions";
import type { PaymentCheckoutResult, PaymentMethod, PaymentSettingsRow } from "@/lib/payments/types";

export function MembershipPaymentPanel({
  openCents,
  feeCents,
}: {
  openCents: number;
  feeCents: number;
}) {
  const [methods, setMethods] = useState<PaymentSettingsRow[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [result, setResult] = useState<PaymentCheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listPaymentMethodsAction().then((rows) =>
      setMethods(
        rows.map((r) => ({
          ...r,
          public_config_json: {},
        })),
      ),
    );
  }, []);

  function pay() {
    if (!method) {
      setError("Bitte Zahlungsart wählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await initiateMembershipPaymentAction({
          paymentMethod: method,
          amountCents: openCents > 0 ? openCents : feeCents,
        });
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Zahlung konnte nicht angelegt werden.");
      }
    });
  }

  if (result) {
    return <PaymentConfirmation result={result} />;
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
        <Wallet className="h-4 w-4" />
        Beitrag bezahlen
      </div>
      <p className="mt-1 text-xs text-amber-900">
        Offener Betrag: {formatEur(openCents > 0 ? openCents : feeCents)} — Zahlung wird zunächst als
        offener Posten erfasst und vom Vorstand bestätigt.
      </p>

      {methods.length ? (
        <div className="mt-3">
          <PaymentMethodPicker
            methods={methods}
            value={method}
            onChange={setMethod}
            disabled={pending}
          />
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}

      <button
        type="button"
        disabled={pending || !method}
        onClick={pay}
        className="mt-3 h-10 rounded-xl bg-fc-navy px-4 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Wird angelegt…" : "Zahlung anlegen"}
      </button>
    </div>
  );
}
