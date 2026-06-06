"use client";

import { formatEur } from "@/lib/club/ledger";
import { quoteShopShipping } from "@/lib/shop/shipping";

export function CartTotals({
  subtotalCents,
  country = "DE",
  compact,
}: {
  subtotalCents: number;
  country?: string | null;
  compact?: boolean;
}) {
  const quote = quoteShopShipping(subtotalCents, country);

  if (compact) {
    return (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Zwischensumme</span>
          <span className="tabular-nums">{formatEur(quote.subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Versand</span>
          <span className="tabular-nums">
            {quote.isFree ? "kostenlos" : formatEur(quote.shippingCents)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold text-slate-900">
          <span>Gesamt</span>
          <span className="tabular-nums">{formatEur(quote.totalCents)}</span>
        </div>
        <p className="text-[11px] text-slate-500">{quote.hint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm text-slate-600">
      <div className="flex justify-between">
        <span>Zwischensumme</span>
        <span className="font-semibold tabular-nums text-slate-900">
          {formatEur(quote.subtotalCents)}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Versand</span>
        <span className="font-semibold tabular-nums text-slate-900">
          {quote.isFree ? "kostenlos" : formatEur(quote.shippingCents)}
        </span>
      </div>
      <p className="text-xs text-slate-500">{quote.hint}</p>
    </div>
  );
}
