"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { formatEur } from "@/lib/club/ledger";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/payments/labels";
import type { PaymentCheckoutResult } from "@/lib/payments/types";

export function PaymentConfirmation({ result }: { result: PaymentCheckoutResult }) {
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <h3 className="font-bold text-emerald-950">Zahlung angelegt — Status offen</h3>
          <p className="mt-1 text-sm text-emerald-900">
            Der Vorstand prüft die Zahlung manuell. Erst nach Bestätigung gilt sie als bezahlt.
          </p>
        </div>
      </div>

      <dl className="grid gap-2 rounded-xl border border-emerald-100 bg-white p-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Betrag</dt>
          <dd className="font-semibold text-slate-900">{formatEur(result.amountCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Zahlungsart</dt>
          <dd className="font-medium">{PAYMENT_METHOD_LABELS[result.paymentMethod]}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Status</dt>
          <dd className="font-medium">{PAYMENT_STATUS_LABELS[result.paymentStatus]}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Verwendungszweck</dt>
          <dd className="font-mono text-xs font-semibold text-slate-900">{result.internalReference}</dd>
        </div>
      </dl>

      {result.testModeMessage ? (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{result.testModeMessage}</p>
        </div>
      ) : null}

      {result.bankDetails ? (
        <div className="rounded-xl border bg-white p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bankverbindung (Platzhalter)
          </p>
          <dl className="mt-2 grid gap-1">
            <div>
              <dt className="text-xs text-slate-500">Kontoinhaber</dt>
              <dd className="font-medium">{result.bankDetails.account_holder}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">IBAN</dt>
              <dd className="font-mono text-sm">{result.bankDetails.iban}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">BIC</dt>
              <dd className="font-mono text-sm">{result.bankDetails.bic}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Verwendungszweck</dt>
              <dd className="font-mono text-sm font-semibold text-fc-navy">
                {result.internalReference}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-600">
            Bitte überweise den Betrag mit genau diesem Verwendungszweck. Die Gutschrift erfolgt nach
            manueller Prüfung durch den Vorstand.
          </p>
        </div>
      ) : null}
    </div>
  );
}
