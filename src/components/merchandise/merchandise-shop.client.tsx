"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur } from "@/lib/club/ledger";
import { listShopProductsAction, type ShopProduct } from "@/app/(app)/merchandise/shop-actions";
import { stockBadgeLabel } from "@/lib/merchandise/stock-label";
import { EmptyState } from "@/components/ui/empty-state";

export function MerchandiseShop() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listShopProductsAction();
        setProducts(res.products);
        setTableMissing(res.tableMissing);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Lade Artikel…</p>;
  }

  if (tableMissing) {
    return <EmptyState>Der Merchandise-Bereich ist noch nicht eingerichtet.</EmptyState>;
  }

  if (!products.length) {
    return <EmptyState>Aktuell sind keine Artikel verfügbar.</EmptyState>;
  }

  return (
    <div className="grid gap-4">
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Übersicht der Fanclub-Artikel. Bestellungen laufen derzeit nicht über die App — bei Interesse
        meldet euch beim Vorstand.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="aspect-[4/3] bg-slate-100" />
            )}
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
              {product.description ? (
                <p className="mt-1 line-clamp-3 text-xs text-slate-600">{product.description}</p>
              ) : null}
              <p className="mt-2 text-sm font-semibold text-fc-navy">
                {formatEur(product.sale_price_cents)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {stockBadgeLabel(product.total_available)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
