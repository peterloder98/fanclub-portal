"use client";

import type { ReactNode } from "react";
import { Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/cn";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments/labels";
import type { PaymentMethod, PaymentSettingsRow } from "@/lib/payments/types";

function PayPalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7.5 19.5h2.2c.5 0 .9-.4 1-1l1.2-7.6c.1-.6-.4-1-1-1H8.3c-.5 0-.9.4-1 1L6 18.5c-.1.6.4 1 1 1zm5.2-9.6h2.2c2.5 0 4.3 1.1 3.9 4.5-.4 3.1-2.6 4.8-5.5 4.8h-1.4c-.5 0-.9.4-1 1l-.6 3.8c-.1.5-.5.9-1 .9H6.8l1.9-12.1h3zm8.1 0c.5 0 .9.4 1 1l-.3 1.8c-.1.5-.5.9-1 .9h-2.1l-.5 3.2h-2.2l1.2-7.6c.1-.6.5-1 1-1h2.8z"
      />
    </svg>
  );
}

const ICONS: Partial<Record<PaymentMethod, ReactNode>> = {
  bank_transfer: <Building2 className="h-5 w-5" />,
  paypal: <PayPalIcon className="h-5 w-5" />,
  stripe: <CreditCard className="h-5 w-5" />,
};

const WALLET_TEST_INFO: Partial<Record<PaymentMethod, string>> = {
  paypal:
    "PayPal ist im Testmodus — es öffnet sich kein echtes PayPal-Login. Die Zahlung wird simuliert.",
  stripe:
    "Stripe ist im Testmodus — es öffnet sich kein echtes Kartenformular. Die Zahlung wird simuliert.",
};

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
  const selected = methods.find((m) => m.provider === value);
  const walletInfo =
    selected && selected.is_test_mode ? WALLET_TEST_INFO[selected.provider] : null;

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zahlungsart</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((m) => {
          const selected = value === m.provider;
          const testHint =
            m.provider !== "bank_transfer" && m.is_test_mode
              ? "Testmodus — keine echte Zahlung"
              : null;
          return (
            <button
              key={m.provider}
              type="button"
              disabled={disabled}
              onClick={() => onChange(m.provider)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                selected
                  ? "border-fc-navy bg-fc-ice ring-2 ring-fc-navy/20"
                  : "border-slate-200 bg-white hover:border-slate-300",
                disabled && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2 text-slate-800">
                <span className="text-fc-navy">{ICONS[m.provider] ?? <CreditCard className="h-5 w-5" />}</span>
                <span className="text-sm font-semibold">{PAYMENT_METHOD_LABELS[m.provider]}</span>
              </div>
              {testHint ? (
                <p className="mt-1 text-[10px] font-medium text-sky-700">{testHint}</p>
              ) : null}
            </button>
          );
        })}
      </div>
      {walletInfo ? (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900">
          {walletInfo}
        </p>
      ) : null}
    </div>
  );
}
