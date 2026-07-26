"use client";

import { useEffect } from "react";
import { Building2 } from "lucide-react";
import type { PaymentMethod, PaymentSettingsRow } from "@/lib/payments/types";

/**
 * Checkout-Auswahl — aktuell nur Banküberweisung.
 * Andere Provider können später wieder ergänzt werden.
 */
export function PaymentMethodPicker({
  methods,
  value,
  onChange,
  disabled,
}: {
  methods: PaymentSettingsRow[];
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (value === "bank_transfer") return;
    if (methods.some((m) => m.provider === "bank_transfer")) {
      onChange("bank_transfer");
    }
  }, [methods, value, onChange]);

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zahlungsart</p>
      <div
        className={`rounded-xl border border-fc-navy/20 bg-fc-ice p-3 ${disabled ? "opacity-50" : ""}`}
      >
        <div className="flex items-center gap-2 text-slate-800">
          <Building2 className="h-5 w-5 text-fc-navy" aria-hidden />
          <span className="text-sm font-semibold">Banküberweisung</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
          Bitte den Betrag manuell auf das Club-Konto überweisen. Der Vorstand bestätigt den
          Zahlungseingang.
        </p>
      </div>
    </div>
  );
}
