"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Package, Truck } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatEur } from "@/lib/club/ledger";
import { paymentStatusBadgeClass } from "@/lib/payments/labels";
import type { PaymentStatus } from "@/lib/payments/types";
import {
  confirmOrderPaymentAction,
  getMerchandiseOrderAction,
  updateMerchandiseOrderStatusAction,
  type MerchandiseOrderDetail,
} from "@/app/(app)/admin/merchandise/order-actions";

const ORDER_STATUS_LABEL: Record<string, string> = {
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
  const [success, setSuccess] = useState<string | null>(null);

  const paymentSettled = order.payment_settled;
  const canConfirmPayment =
    Boolean(order.payment_id) && !paymentSettled && order.status === "pending";
  const canShip = order.status === "pending" && (!order.payment_id || paymentSettled);
  const awaitingPayment = order.status === "pending" && !paymentSettled && Boolean(order.payment_id);

  const fullAddress = [
    order.buyer_street,
    `${order.buyer_postal_code} ${order.buyer_city}`,
    order.buyer_country !== "DE" ? order.buyer_country : null,
  ]
    .filter(Boolean)
    .join("\n");

  function refresh() {
    startTransition(async () => {
      const fresh = await getMerchandiseOrderAction(order.id);
      if (fresh) setOrder(fresh);
      router.refresh();
    });
  }

  function confirmPayment() {
    if (!window.confirm("Zahlungseingang wirklich verbuchen?")) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await confirmOrderPaymentAction({ orderId: order.id });
        setSuccess("Zahlung wurde verbucht — Versand ist jetzt möglich.");
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verbuchen fehlgeschlagen");
      }
    });
  }

  function setStatus(status: "shipped" | "cancelled") {
    const label = status === "shipped" ? "als versendet markieren" : "stornieren";
    if (!window.confirm(`Bestellung wirklich ${label}?`)) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await updateMerchandiseOrderStatusAction({ orderId: order.id, status });
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Ablauf: Zahlung → Versand */}
      <div className="rounded-2xl border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ablauf</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          <li
            className={cn(
              "flex gap-3 rounded-xl border p-3",
              paymentSettled ? "border-emerald-200 bg-emerald-50/80" : "border-amber-200 bg-amber-50/60",
            )}
          >
            <CreditCard
              className={cn("mt-0.5 h-5 w-5 shrink-0", paymentSettled ? "text-emerald-700" : "text-amber-700")}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-fc-navy">1. Zahlung</p>
              {order.payment_method_label ? (
                <p className="mt-0.5 text-xs text-slate-700">{order.payment_method_label}</p>
              ) : null}
              {order.payment_status_label && order.payment_db_status ? (
                <span
                  className={cn(
                    "mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                    paymentStatusBadgeClass(order.payment_db_status as PaymentStatus),
                  )}
                >
                  {order.payment_status_label}
                </span>
              ) : (
                <p className="mt-1 text-xs text-slate-600">Keine Zahlung verknüpft</p>
              )}
            </div>
          </li>
          <li
            className={cn(
              "flex gap-3 rounded-xl border p-3",
              order.status === "shipped"
                ? "border-emerald-200 bg-emerald-50/80"
                : canShip
                  ? "border-sky-200 bg-sky-50/50"
                  : "border-slate-200 bg-slate-50",
            )}
          >
            <Truck
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                order.status === "shipped" ? "text-emerald-700" : "text-slate-500",
              )}
            />
            <div>
              <p className="text-sm font-bold text-fc-navy">2. Versand</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {order.status === "shipped"
                  ? "Versendet"
                  : canShip
                    ? "Bereit zum Versand"
                    : awaitingPayment
                      ? "Wartet auf Zahlungsbestätigung"
                      : "Noch nicht versendet"}
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Bestellstatus</p>
          <p className="mt-1 text-lg font-bold text-fc-navy">
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Eingegangen{" "}
            {new Date(order.created_at).toLocaleString("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>

        {order.status === "pending" ? (
          <div className="flex flex-wrap gap-2">
            {canConfirmPayment ? (
              <button
                type="button"
                disabled={pending}
                onClick={confirmPayment}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Zahlung verbuchen
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending || !canShip}
              title={
                !canShip && awaitingPayment
                  ? "Erst Zahlung verbuchen, dann versenden"
                  : undefined
              }
              onClick={() => setStatus("shipped")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Package className="h-4 w-4" />
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

      {awaitingPayment ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Die Zahlung ist noch nicht verbucht. Bitte prüfe den Eingang und klicke auf{" "}
          <strong>„Zahlung verbuchen“</strong>, bevor du versendest.
        </p>
      ) : null}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-800">{success}</p> : null}

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
            <dl className="mt-2 grid gap-2">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Zahlungsart</dt>
                <dd className="font-semibold text-fc-navy">{order.payment_method_label}</dd>
              </div>
              {order.payment_status_label && order.payment_db_status ? (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        paymentStatusBadgeClass(order.payment_db_status as PaymentStatus),
                      )}
                    >
                      {order.payment_status_label}
                    </span>
                  </dd>
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
          {order.payment_id ? (
            <Link
              href={`/admin/payments?payment=${order.payment_id}`}
              className="mt-4 inline-flex text-xs font-semibold text-fc-blue hover:underline"
            >
              Zur Zahlung in der Zahlungsübersicht →
            </Link>
          ) : null}
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
            <li
              key={e.id}
              className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
            >
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
