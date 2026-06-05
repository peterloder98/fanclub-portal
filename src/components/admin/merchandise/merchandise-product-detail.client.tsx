"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { formatEur } from "@/lib/club/ledger";
import { cn } from "@/lib/cn";
import {
  addStockReceiptAction,
  deleteMerchandiseProductAction,
  listMerchandiseExpenseOptionsAction,
  type MerchandiseProductRow,
} from "@/app/(app)/admin/merchandise/actions";

export function MerchandiseProductDetail({ product }: { product: MerchandiseProductRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRestock, setShowRestock] = useState(false);
  const [expenseOptions, setExpenseOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [restockQty, setRestockQty] = useState("");
  const [restockVariantId, setRestockVariantId] = useState<string | null>(
    product.has_sizes ? null : product.variants[0]?.id ?? null,
  );
  const [restockLedgerId, setRestockLedgerId] = useState<string | null>(null);
  const [restockPurchaseEur, setRestockPurchaseEur] = useState("");
  const [restockCreateExpense, setRestockCreateExpense] = useState(false);
  const [restockNote, setRestockNote] = useState("");

  function loadExpenses() {
    void listMerchandiseExpenseOptionsAction().then(setExpenseOptions).catch(() => []);
  }

  function handleRestock() {
    setError(null);
    startTransition(async () => {
      try {
        await addStockReceiptAction({
          productId: product.id,
          variantId: restockVariantId,
          qtyAdded: Number(restockQty),
          ledgerEntryId: restockLedgerId,
          purchaseTotalEur: restockPurchaseEur
            ? Number(restockPurchaseEur.replace(",", "."))
            : null,
          createPurchaseExpense: restockCreateExpense && !restockLedgerId,
          note: restockNote,
        });
        setRestockQty("");
        setRestockNote("");
        setShowRestock(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nachbestellung fehlgeschlagen");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`„${product.name}" wirklich löschen?`)) return;
    startTransition(async () => {
      await deleteMerchandiseProductAction(product.id);
      router.push("/admin/merchandise");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/merchandise" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
        ← Alle Artikel
      </Link>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <div className="aspect-square bg-slate-100 lg:aspect-auto lg:min-h-[280px]">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full min-h-[200px] place-items-center text-sm text-slate-400">
                Kein Foto
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {product.sale_price_cents <= 0 ? "Geschenkartikel" : "Im Shop"}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{product.name}</h1>
              <p className="mt-2 text-xl font-bold">
                {product.sale_price_cents <= 0 ? "0 €" : formatEur(product.sale_price_cents)}
              </p>
              {product.description ? (
                <p className="mt-3 text-sm text-slate-600">{product.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                  {product.total_available} verfügbar
                </span>
                {product.total_reserved > 0 ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
                    {product.total_reserved} reserviert
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  {product.total_sold} verkauft · {product.total_gifted} geschenkt
                </span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`/admin/merchandise/${product.id}/edit`}
                className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"
              >
                <Pencil className="h-4 w-4" />
                Bearbeiten
              </Link>
              <button
                type="button"
                onClick={() => {
                  loadExpenses();
                  setShowRestock((v) => !v);
                }}
                className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white"
              >
                + Nachbestellen
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRestock ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-900">Nachbestellung</h2>
          <p className="mt-1 text-xs text-slate-600">
            Bestand erhöhen und optional Rechnung/Buchung zuordnen.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {product.has_sizes ? (
              <label className="grid gap-1">
                <span className="text-xs font-medium">Größe *</span>
                <select
                  value={restockVariantId ?? ""}
                  onChange={(e) => setRestockVariantId(e.target.value || null)}
                  className="h-11 rounded-xl border px-3 text-sm"
                >
                  <option value="">Bitte wählen</option>
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.size_label ?? "—"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1">
              <span className="text-xs font-medium">Menge *</span>
              <input
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                type="number"
                min={1}
                className="h-11 rounded-xl border px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-medium">Buchung / Rechnung</span>
              <select
                value={restockLedgerId ?? ""}
                onChange={(e) => setRestockLedgerId(e.target.value || null)}
                className="h-11 rounded-xl border px-3 text-sm"
              >
                <option value="">— Keine / neue anlegen —</option>
                {expenseOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {!restockLedgerId ? (
              <>
                <label className="grid gap-1">
                  <span className="text-xs font-medium">Einkaufssumme (€)</span>
                  <input
                    value={restockPurchaseEur}
                    onChange={(e) => setRestockPurchaseEur(e.target.value)}
                    type="number"
                    step="0.01"
                    className="h-11 rounded-xl border px-3 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 self-end text-sm">
                  <input
                    type="checkbox"
                    checked={restockCreateExpense}
                    onChange={(e) => setRestockCreateExpense(e.target.checked)}
                  />
                  Als Ausgabe anlegen
                </label>
              </>
            ) : null}
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-medium">Notiz</span>
              <input
                value={restockNote}
                onChange={(e) => setRestockNote(e.target.value)}
                className="h-11 rounded-xl border px-3 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending || !restockQty || Number(restockQty) <= 0}
              onClick={handleRestock}
              className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Nachbestellung buchen
            </button>
            <button
              type="button"
              onClick={() => setShowRestock(false)}
              className="h-11 rounded-xl border px-5 text-sm font-semibold"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Bestand & Größen</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {product.variants.map((v) => (
            <div key={v.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-lg font-bold text-slate-900">{v.size_label ?? "Einheitsgröße"}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">Verfügbar</dt>
                  <dd className="text-lg font-bold text-emerald-700">{v.available}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Reserviert</dt>
                  <dd className="font-semibold text-amber-700">{v.qty_reserved}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Verkauft</dt>
                  <dd>{v.qty_sold}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Geschenkt</dt>
                  <dd>{v.qty_gifted}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Eingekauft gesamt</dt>
                  <dd className="font-medium">{v.qty_purchased}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Einkaufshistorie</h2>
        {product.stock_receipts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Noch keine Nachbestellungen erfasst.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {product.stock_receipts.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-semibold text-emerald-800">+{r.qty_added}</span>
                  {r.size_label ? ` · Größe ${r.size_label}` : ""}
                  {r.note ? <span className="text-slate-600"> — {r.note}</span> : null}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleString("de-DE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {product.ledger_entry_ids.length > 0 ? (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Buchhaltung</h2>
          <ul className="mt-3 space-y-2">
            {product.ledger_entry_ids.map((id) => (
              <li key={id}>
                <Link
                  href={`/admin/accounting?entry=${id}`}
                  className={cn(
                    "block rounded-xl border bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50",
                  )}
                >
                  Buchung anzeigen →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
