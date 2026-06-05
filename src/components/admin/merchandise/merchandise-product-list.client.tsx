"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Package, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur } from "@/lib/club/ledger";
import { cn } from "@/lib/cn";
import {
  listMerchandiseProductsAction,
  seedMerchandiseDefaultsAction,
  type MerchandiseProductRow,
} from "@/app/(app)/admin/merchandise/actions";

type Filter = "all" | "sale" | "gift" | "soldout" | "sizes";

export function MerchandiseProductList() {
  const [products, setProducts] = useState<MerchandiseProductRow[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    try {
      const res = await listMerchandiseProductsAction();
      setTableMissing(res.tableMissing);
      if (!res.tableMissing && res.products.length === 0) {
        await seedMerchandiseDefaultsAction();
        const again = await listMerchandiseProductsAction();
        setProducts(again.products);
      } else {
        setProducts(res.products);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filter === "sale") return p.sale_price_cents > 0;
      if (filter === "gift") return p.sale_price_cents <= 0;
      if (filter === "soldout") return p.total_available <= 0;
      if (filter === "sizes") return p.has_sizes;
      return true;
    });
  }, [products, filter]);

  const stats = useMemo(
    () => ({
      count: products.length,
      reserved: products.reduce((s, p) => s + p.total_reserved, 0),
    }),
    [products],
  );

  if (tableMissing) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-amber-800">
          Merchandise-Tabelle fehlt. Bitte Migration 052/057 in Supabase ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:max-w-md lg:max-w-lg">
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-3 pt-4">
              <Package className="h-8 w-8 text-slate-400" />
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Artikel</p>
                <p className="text-2xl font-bold text-slate-900">{stats.count}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Reserviert</p>
              <p className="text-2xl font-bold text-amber-700">{stats.reserved}</p>
            </CardContent>
          </Card>
        </div>
        <Link
          href="/admin/merchandise/new"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Artikel anlegen
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "Alle"],
            ["sale", "Im Shop"],
            ["gift", "Geschenk"],
            ["soldout", "Ausverkauft"],
            ["sizes", "Mit Größen"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "h-9 rounded-full px-3 text-xs font-semibold transition",
              filter === key
                ? "bg-slate-900 text-white"
                : "border bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
          Keine Artikel in dieser Ansicht.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/admin/merchandise/${p.id}`}
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-slate-400">Kein Foto</div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-bold text-white">
                  {p.sale_price_cents <= 0 ? "Geschenk" : formatEur(p.sale_price_cents)}
                </span>
                {p.total_available <= 0 ? (
                  <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    Ausverkauft
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{p.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                    {p.total_available} verfügbar
                  </span>
                  {p.total_reserved > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                      {p.total_reserved} reserviert
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {p.total_sold} verkauft
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-blue-700 group-hover:underline">
                  Details öffnen →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
