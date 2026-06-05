"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatEur } from "@/lib/club/ledger";
import {
  getMerchandiseOrderAction,
  updateMerchandiseOrderStatusAction,
  type MerchandiseOrderDetail,
} from "@/app/(app)/admin/merchandise/order-actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Offen",
  shipped: "Versendet",
  cancelled: "Storniert",
};

export function MerchandiseOrderDetail({ initial }: { initial: MerchandiseOrderDetail }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(status: "shipped" | "cancelled") {
    const label = status === "shipped" ? "als versendet markieren" : "stornieren";
    if (!window.confirm(`Bestellung wirklich ${label}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateMerchandiseOrderStatusAction({ orderId: order.id, status });
        const fresh = await getMerchandiseOrderAction(order.id);
        if (fresh) setOrder(fresh);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {STATUS_LABEL[order.status] ?? order.status}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(order.created_at).toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        {order.status === "pending" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("shipped")}
              className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Als versendet markieren
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("cancelled")}
              className="h-10 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              Stornieren
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="text-xs font-semibold uppercase text-slate-500">Käufer</h2>
          <p className="mt-2 font-semibold text-slate-900">
            {order.buyer_first_name} {order.buyer_last_name}
          </p>
          <p className="text-slate-600">{order.buyer_email}</p>
          {order.buyer_phone ? <p className="text-slate-600">{order.buyer_phone}</p> : null}
          <p className="mt-2 text-slate-700">
            {order.buyer_street}
            <br />
            {order.buyer_postal_code} {order.buyer_city}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="text-xs font-semibold uppercase text-slate-500">Positionen</h2>
          <ul className="mt-2 space-y-1">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>
                  {i.qty}× {i.product_name}
                  {i.size_label ? ` (${i.size_label})` : ""}
                </span>
                <span className="font-medium tabular-nums">{formatEur(i.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t pt-2 font-bold text-slate-900">
            Gesamt: {formatEur(order.total_cents)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-xs font-semibold uppercase text-slate-500">Historie</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.events.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
              <div>
                <p className="font-medium text-slate-900">{e.title}</p>
                {e.details ? <p className="text-xs text-slate-600">{e.details}</p> : null}
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>
                  {new Date(e.created_at).toLocaleString("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                {e.created_by_name ? <p>{e.created_by_name}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
