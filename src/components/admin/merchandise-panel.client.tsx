"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEur } from "@/lib/club/ledger";
import {
  DocumentUploadField,
  uploadClubDocument,
} from "@/components/ui/document-upload-field";
import {
  deleteMerchandiseProductAction,
  listMerchandiseExpenseOptionsAction,
  listMerchandiseProductsAction,
  refreshMerchandiseImagesAction,
  saveMerchandiseProductAction,
  seedMerchandiseDefaultsAction,
  type MerchandiseProductRow,
  type MerchandiseVariantInput,
} from "@/app/(app)/admin/merchandise/actions";

const SIZE_PRESETS = ["S", "M", "L", "XL", "XXL"];

export function MerchandisePanel() {
  const router = useRouter();
  const [products, setProducts] = useState<MerchandiseProductRow[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [purchaseTotal, setPurchaseTotal] = useState("");
  const [hasSizes, setHasSizes] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<MerchandiseVariantInput[]>([
    { size_label: null, qty_purchased: 0, qty_sold: 0, qty_gifted: 0 },
  ]);
  const [ledgerEntryId, setLedgerEntryId] = useState<string | null>(null);
  const [createPurchaseExpense, setCreatePurchaseExpense] = useState(false);
  const [expenseOptions, setExpenseOptions] = useState<Array<{ id: string; label: string }>>([]);

  async function reload() {
    setLoading(true);
    try {
      const [res, expenses] = await Promise.all([
        listMerchandiseProductsAction(),
        listMerchandiseExpenseOptionsAction().catch(() => []),
      ]);
      setTableMissing(res.tableMissing);
      setProducts(res.products);
      setExpenseOptions(expenses);
      if (!res.tableMissing && res.products.length === 0) {
        await seedMerchandiseDefaultsAction();
        const again = await listMerchandiseProductsAction();
        setProducts(again.products);
      } else if (
        !res.tableMissing &&
        res.products.length > 0 &&
        typeof window !== "undefined" &&
        !window.sessionStorage.getItem("merch-images-v2")
      ) {
        await refreshMerchandiseImagesAction();
        window.sessionStorage.setItem("merch-images-v2", "1");
        const again = await listMerchandiseProductsAction();
        setProducts(again.products);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function resetForm() {
    setEditId(null);
    setName("");
    setDescription("");
    setSalePrice("");
    setPurchaseTotal("");
    setHasSizes(false);
    setImagePath(null);
    setImagePreviewUrl(null);
    setVariants([{ size_label: null, qty_purchased: 0, qty_sold: 0, qty_gifted: 0 }]);
    setLedgerEntryId(null);
    setCreatePurchaseExpense(false);
    setShowForm(false);
  }

  function openEdit(p: MerchandiseProductRow) {
    setEditId(p.id);
    setName(p.name);
    setDescription(p.description ?? "");
    setSalePrice((p.sale_price_cents / 100).toFixed(2));
    setPurchaseTotal(
      p.purchase_total_cents != null ? (p.purchase_total_cents / 100).toFixed(2) : "",
    );
    setHasSizes(p.has_sizes);
    setImagePath(p.image_path);
    setImagePreviewUrl(p.image_url);
    setLedgerEntryId(p.ledger_entry_id);
    setCreatePurchaseExpense(false);
    setVariants(
      p.variants.length
        ? p.variants.map((v) => ({
            size_label: v.size_label,
            qty_purchased: v.qty_purchased,
            qty_sold: v.qty_sold,
            qty_gifted: v.qty_gifted,
          }))
        : [{ size_label: null, qty_purchased: 0, qty_sold: 0, qty_gifted: 0 }],
    );
    setShowForm(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await saveMerchandiseProductAction({
          id: editId,
          name,
          description,
          salePriceEur: Number(salePrice.replace(",", ".")),
          purchaseTotalEur: purchaseTotal ? Number(purchaseTotal.replace(",", ".")) : null,
          hasSizes,
          imagePath,
          ledgerEntryId,
          createPurchaseExpense: createPurchaseExpense && !ledgerEntryId,
          variants,
        });
        resetForm();
        await reload();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  if (tableMissing) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-amber-800">
          Merchandise-Tabelle fehlt. Bitte{" "}
          <code className="rounded bg-amber-100 px-1">supabase/052_accounting_merchandise.sql</code>{" "}
          ausführen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!showForm ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Artikel anlegen
          </button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Artikel bearbeiten" : "Neuer Artikel"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-medium">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" />
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-medium">Beschreibung</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Verkaufspreis (€)</span>
              <input value={salePrice} onChange={(e) => setSalePrice(e.target.value)} type="number" step="0.01" className="h-10 rounded-xl border px-3 text-sm" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Einkauf gesamt (€, optional)</span>
              <input value={purchaseTotal} onChange={(e) => setPurchaseTotal(e.target.value)} type="number" step="0.01" className="h-10 rounded-xl border px-3 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={hasSizes} onChange={(e) => {
                const checked = e.target.checked;
                setHasSizes(checked);
                if (checked && !description.trim()) {
                  setDescription("Textil-Produkt mit verschiedenen Größen");
                }
              }} />
              Textil mit Größen (S/M/L/…)
            </label>
            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm font-medium">Buchung Einkauf (optional)</span>
              <select
                value={ledgerEntryId ?? ""}
                onChange={(e) => {
                  setLedgerEntryId(e.target.value || null);
                  if (e.target.value) setCreatePurchaseExpense(false);
                }}
                className="h-10 rounded-xl border px-3 text-sm"
              >
                <option value="">— keine Zuordnung —</option>
                {expenseOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            {!ledgerEntryId && purchaseTotal ? (
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={createPurchaseExpense}
                  onChange={(e) => setCreatePurchaseExpense(e.target.checked)}
                />
                Neue Ausgabe in der Buchhaltung anlegen
              </label>
            ) : null}
            <div className="md:col-span-2">
              <DocumentUploadField
                label="Produktfoto"
                onFileSelected={async (file) => {
                  const path = await uploadClubDocument(file, "merchandise", editId ?? undefined);
                  setImagePath(path);
                  const res = await fetch(`/api/club-documents/signed?path=${encodeURIComponent(path)}`);
                  const json = (await res.json()) as { url?: string };
                  setImagePreviewUrl(json.url ?? null);
                }}
                onClear={() => {
                  setImagePath(null);
                  setImagePreviewUrl(null);
                }}
                previewUrl={imagePreviewUrl}
              />
            </div>
            <div className="md:col-span-2 overflow-hidden rounded-xl border bg-white">
              <p className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Bestand</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="border-b text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{hasSizes ? "Größe" : "Variante"}</th>
                      <th className="px-3 py-2">Eingekauft</th>
                      <th className="px-3 py-2">Verkauft</th>
                      <th className="px-3 py-2">Verschenkt</th>
                      <th className="px-3 py-2">Verfügbar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => {
                      const available = Math.max(0, v.qty_purchased - v.qty_sold - v.qty_gifted);
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            {hasSizes ? (
                              <select
                                value={v.size_label ?? ""}
                                onChange={(e) => {
                                  const next = [...variants];
                                  next[i] = { ...v, size_label: e.target.value || null };
                                  setVariants(next);
                                }}
                                className="h-9 w-full min-w-[4rem] rounded-lg border px-2"
                              >
                                <option value="">Größe</option>
                                {SIZE_PRESETS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-600">Einheitsgröße</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={v.qty_purchased || ""}
                              onChange={(e) => {
                                const next = [...variants];
                                next[i] = { ...v, qty_purchased: Number(e.target.value) || 0 };
                                setVariants(next);
                              }}
                              className="h-9 w-20 rounded-lg border px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={v.qty_sold || ""}
                              onChange={(e) => {
                                const next = [...variants];
                                next[i] = { ...v, qty_sold: Number(e.target.value) || 0 };
                                setVariants(next);
                              }}
                              className="h-9 w-20 rounded-lg border px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={v.qty_gifted || ""}
                              onChange={(e) => {
                                const next = [...variants];
                                next[i] = { ...v, qty_gifted: Number(e.target.value) || 0 };
                                setVariants(next);
                              }}
                              className="h-9 w-20 rounded-lg border px-2"
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold tabular-nums text-emerald-800">
                            {available}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasSizes ? (
                <div className="border-t px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setVariants([
                        ...variants,
                        { size_label: "M", qty_purchased: 0, qty_sold: 0, qty_gifted: 0 },
                      ])
                    }
                    className="text-xs font-semibold text-blue-600"
                  >
                    + Größe hinzufügen
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button type="button" disabled={pending || !name.trim() || salePrice === ""} onClick={handleSave} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
                Speichern
              </button>
              <button type="button" onClick={resetForm} className="h-10 rounded-xl border px-4 text-sm font-semibold">
                Abbrechen
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Lade Artikel…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Merchandise-Artikel.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Artikel</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{products.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Verfügbar gesamt</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {products.reduce((s, p) => s + p.total_available, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Mit Größen</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {products.filter((p) => p.has_sizes).length}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden shadow-sm">
                <div className="relative h-40 bg-slate-100">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-slate-400">Kein Foto</div>
                  )}
                  <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-emerald-800 shadow">
                    {p.sale_price_cents <= 0 ? "Geschenk" : formatEur(p.sale_price_cents)}
                  </span>
                </div>
                <CardContent className="pt-4">
                  <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                  {p.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{p.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                      {p.total_available} verfügbar
                    </span>
                    {p.purchase_total_cents != null ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                        Einkauf {formatEur(p.purchase_total_cents)}
                      </span>
                    ) : null}
                  </div>
                  {p.has_sizes && p.variants.length ? (
                    <div className="mt-3 overflow-hidden rounded-lg border text-[11px]">
                      <table className="w-full">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-2 py-1 text-left">Gr.</th>
                            <th className="px-2 py-1 text-right">Verfüg.</th>
                            <th className="px-2 py-1 text-right">Verk.</th>
                            <th className="px-2 py-1 text-right">Geschenkt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.variants.map((v) => (
                            <tr key={v.id} className="border-t">
                              <td className="px-2 py-1 font-medium">{v.size_label ?? "—"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">{v.available}</td>
                              <td className="px-2 py-1 text-right tabular-nums text-slate-500">{v.qty_sold}</td>
                              <td className="px-2 py-1 text-right tabular-nums text-slate-500">{v.qty_gifted}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">
                      {p.variants[0]
                        ? `${p.variants[0].qty_sold} verkauft · ${p.variants[0].qty_gifted} verschenkt`
                        : null}
                    </p>
                  )}
                  <div className="mt-4 flex gap-3 border-t pt-3">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`„${p.name}" löschen?`)) return;
                        startTransition(async () => {
                          await deleteMerchandiseProductAction(p.id);
                          await reload();
                        });
                      }}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      Löschen
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
