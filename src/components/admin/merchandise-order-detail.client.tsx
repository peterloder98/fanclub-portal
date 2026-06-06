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

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* ignore */
        }
      }}
      className="h-9 rounded-lg border px-3 text-xs font-semibold text-slate-700"
    >
      {copied ? "Kopiert" : label}
    </button>
  );
}

export function MerchandiseOrderDetail({ initial }: { initial: MerchandiseOrderDetail }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fullAddress = [
    order.buyer_street,
    `${order.buyer_postal_code} ${order.buyer_city}`,
    order.buyer_country !== "DE" ? order.buyer_country : null,
  ]
    .filter(Boolean)
    .join("\n");

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
          <p className="mt-1 text-lg font-bold text-fc-navy">
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
          <p className="mt-2 font-semibold text-fc-navy">
            {order.buyer_first_name} {order.buyer_last_name}
          </p>
          <p className="text-slate-600">{order.buyer_email}</p>
          {order.buyer_phone ? <p className="text-slate-600">{order.buyer_phone}</p> : null}
          <p className="mt-2 whitespace-pre-line text-slate-700">{fullAddress}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton label="E-Mail kopieren" value={order.buyer_email} />
            <CopyButton label="Adresse kopieren" value={fullAddress} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="text-xs font-semibold uppercase text-slate-500">Zahlung</h2>
          {order.payment_method_label ? (
            <dl className="mt-2 grid gap-1.5">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Zahlungsart</dt>
                <dd className="font-semibold text-fc-navy">{order.payment_method_label}</dd>
              </div>
              {order.payment_status_label ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Zahlungsstatus</dt>
                  <dd className="font-medium">{order.payment_status_label}</dd>
                </div>
              ) : null}
              {order.internal_reference ? (
                <div>
                  <dt className="text-slate-500">Verwendungszweck</dt>
                  <dd className="font-mono text-xs font-semibold">{order.internal_reference}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-slate-600">Keine Zahlungsdaten hinterlegt.</p>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4 text-sm md:col-span-2">
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
          <div className="mt-3 space-y-1 border-t pt-2 text-sm">
            {order.subtotal_cents != null && order.subtotal_cents !== order.total_cents ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Zwischensumme</span>
                  <span className="tabular-nums">{formatEur(order.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Versand</span>
                  <span className="tabular-nums">
                    {order.shipping_cents > 0 ? formatEur(order.shipping_cents) : "kostenlos"}
                  </span>
                </div>
              </>
            ) : null}
            <p className="flex justify-between font-bold text-fc-navy">
              <span>Gesamt</span>
              <span className="tabular-nums">{formatEur(order.total_cents)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-xs font-semibold uppercase text-slate-500">Historie</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.events.map((e) => (
            <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
              <div>
                <p className="font-medium text-fc-navy">{e.title}</p>
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
