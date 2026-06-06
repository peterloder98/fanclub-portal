"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { formatEur } from "@/lib/club/ledger";
import {
  listMerchandiseOrdersAction,
  type MerchandiseOrderRow,
} from "@/app/(app)/admin/merchandise/order-actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Offen",
  shipped: "Versendet",
  cancelled: "Storniert",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900",
  shipped: "bg-emerald-50 text-emerald-900",
  cancelled: "bg-slate-100 text-slate-600",
};

function OrderCard({ o }: { o: MerchandiseOrderRow }) {
  return (
    <Link
      href={`/admin/merchandise/orders/${o.id}`}
      className="block rounded-xl border bg-white p-4 shadow-sm transition hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-fc-navy">
            {o.buyer_first_name} {o.buyer_last_name}
          </p>
          <p className="text-xs text-slate-500">{o.buyer_email}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[o.status] ?? ""}`}
        >
          {STATUS_LABEL[o.status] ?? o.status}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-slate-600">
          {new Date(o.created_at).toLocaleString("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
        <span className="font-bold tabular-nums">{formatEur(o.total_cents)}</span>
      </div>
      <p className="mt-1 text-xs text-fc-blue">Details →</p>
    </Link>
  );
}

export function MerchandiseOrdersPanel() {
  const [orders, setOrders] = useState<MerchandiseOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setLoading(true);
      try {
        setOrders(await listMerchandiseOrdersAction());
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Lade Bestellungen…</p>;

  if (!orders.length) {
    return <p className="text-sm text-slate-500">Noch keine Bestellungen.</p>;
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-xl border bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Käufer</th>
              <th className="px-4 py-3">Positionen</th>
              <th className="px-4 py-3">Summe</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-3 text-xs text-slate-600">
                  {new Date(o.created_at).toLocaleString("de-DE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-fc-navy">
                    {o.buyer_first_name} {o.buyer_last_name}
                  </p>
                  <p className="text-xs text-slate-500">{o.buyer_email}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">{o.item_count}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{formatEur(o.total_cents)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[o.status] ?? ""}`}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/merchandise/orders/${o.id}`}
                    className="text-xs font-semibold text-fc-blue hover:underline"
                  >
                    Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
