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
    <div className="overflow-hidden rounded-xl border bg-white">
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
                <p className="font-medium text-slate-900">
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
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Details →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
