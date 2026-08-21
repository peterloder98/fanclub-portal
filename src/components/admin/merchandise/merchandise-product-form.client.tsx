"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DocumentUploadField,
  uploadClubDocument,
} from "@/components/ui/document-upload-field";
import {
  listMerchandiseExpenseOptionsAction,
  saveMerchandiseProductAction,
  type MerchandiseProductRow,
  type MerchandiseVariantInput,
} from "@/app/(app)/admin/merchandise/actions";
import { decimalInputProps, integerInputProps, sanitizeDecimalInput, sanitizeDigitsInput } from "@/lib/input/decimal-input";

const SIZE_PRESETS = ["S", "M", "L", "XL", "XXL"];

export function MerchandiseProductForm({
  product,
  mode,
}: {
  product?: MerchandiseProductRow | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [salePrice, setSalePrice] = useState(
    product ? (product.sale_price_cents / 100).toFixed(2) : "",
  );
  const [purchaseTotal, setPurchaseTotal] = useState(
    product?.purchase_total_cents != null
      ? (product.purchase_total_cents / 100).toFixed(2)
      : "",
  );
  const [hasSizes, setHasSizes] = useState(product?.has_sizes ?? false);
  const [imagePaths, setImagePaths] = useState<string[]>(
    product?.image_paths?.length
      ? product.image_paths
      : product?.image_path
        ? [product.image_path]
        : [],
  );
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(
    product?.image_urls?.length
      ? product.image_urls
      : product?.image_url
        ? [product.image_url]
        : [],
  );
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [variants, setVariants] = useState<MerchandiseVariantInput[]>(
    product?.variants.length
      ? product.variants.map((v) => ({
          size_label: v.size_label,
          qty_purchased: v.qty_purchased,
          qty_sold: v.qty_sold,
          qty_gifted: v.qty_gifted,
        }))
      : [{ size_label: null, qty_purchased: 0, qty_sold: 0, qty_gifted: 0 }],
  );
  const [ledgerEntryId, setLedgerEntryId] = useState<string | null>(
    product?.ledger_entry_id ?? null,
  );
  const [createPurchaseExpense, setCreatePurchaseExpense] = useState(false);
  const [expenseOptions, setExpenseOptions] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    void listMerchandiseExpenseOptionsAction().then(setExpenseOptions).catch(() => []);
  }, []);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveMerchandiseProductAction({
          id: product?.id,
          name,
          description,
          salePriceEur: Number(salePrice.replace(",", ".")),
          purchaseTotalEur: purchaseTotal ? Number(purchaseTotal.replace(",", ".")) : null,
          hasSizes,
          imagePaths,
          ledgerEntryId,
          createPurchaseExpense: createPurchaseExpense && !ledgerEntryId,
          variants,
        });
        router.push(`/admin/merchandise/${result.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    });
  }

  async function addProductImage(file: File) {
    if (imagePaths.length >= 3) {
      throw new Error("Maximal 3 Bilder pro Artikel.");
    }
    const path = await uploadClubDocument(file, "merchandise", product?.id);
    const res = await fetch(`/api/club-documents/signed?path=${encodeURIComponent(path)}`);
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? "Vorschau konnte nicht geladen werden.");
    }
    setImagePaths((prev) => [...prev, path].slice(0, 3));
    setImagePreviewUrls((prev) => [...prev, json.url ?? path].slice(0, 3));
  }

  function removeProductImage(index: number) {
    setImagePaths((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={product ? `/admin/merchandise/${product.id}` : "/admin/merchandise"}
        className="text-sm font-semibold text-slate-600 hover:text-fc-navy"
      >
        ← Zurück
      </Link>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Neuer Artikel" : "Artikel bearbeiten"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl border px-3 text-sm"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Beschreibung</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Verkaufspreis (€)</span>
              <input
                value={salePrice}
                onChange={(e) => setSalePrice(sanitizeDecimalInput(e.target.value))}
                className="h-11 rounded-xl border px-3 text-sm"
                {...decimalInputProps()}
              />
              <span className="text-xs text-slate-500">0 € = Geschenkartikel (nicht im Shop)</span>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Einkauf gesamt (€, optional)</span>
              <input
                value={purchaseTotal}
                onChange={(e) => setPurchaseTotal(sanitizeDecimalInput(e.target.value))}
                className="h-11 rounded-xl border px-3 text-sm"
                {...decimalInputProps()}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasSizes}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasSizes(checked);
                if (checked && !description.trim()) {
                  setDescription("Textil-Produkt mit verschiedenen Größen");
                }
              }}
            />
            Textil mit Größen (S/M/L/…)
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Buchung Einkauf (optional)</span>
            <select
              value={ledgerEntryId ?? ""}
              onChange={(e) => {
                setLedgerEntryId(e.target.value || null);
                if (e.target.value) setCreatePurchaseExpense(false);
              }}
              className="h-11 rounded-xl border px-3 text-sm"
            >
              <option value="">— keine Zuordnung —</option>
              {expenseOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {!ledgerEntryId && purchaseTotal ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createPurchaseExpense}
                onChange={(e) => setCreatePurchaseExpense(e.target.checked)}
              />
              Neue Ausgabe in der Buchhaltung anlegen
            </label>
          ) : null}
          <div className="grid gap-2">
            <span className="text-sm font-medium">Produktfotos (bis zu 3)</span>
            {imageUploadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {imageUploadError}
              </div>
            ) : null}
            {imagePreviewUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {imagePreviewUrls.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative overflow-hidden rounded-xl border bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeProductImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {imagePaths.length < 3 ? (
              <DocumentUploadField
                key={imagePaths.length}
                label={imagePaths.length === 0 ? "Erstes Bild" : `Weiteres Bild (${imagePaths.length}/3)`}
                onFileSelected={async (file) => {
                  setImageUploadError(null);
                  try {
                    await addProductImage(file);
                  } catch (e) {
                    setImageUploadError(e instanceof Error ? e.message : "Bild-Upload fehlgeschlagen");
                    throw e;
                  }
                }}
                onClear={() => {}}
              />
            ) : (
              <p className="text-xs text-slate-500">Maximal 3 Bilder erreicht.</p>
            )}
          </div>

          <div className="rounded-xl border bg-white">
            <p className="border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
              Bestand
            </p>
            <div className="divide-y md:hidden">
              {variants.map((v, i) => {
                const available = Math.max(0, v.qty_purchased - v.qty_sold - v.qty_gifted);
                return (
                  <div key={i} className="space-y-2 p-4">
                    {hasSizes ? (
                      <select
                        value={v.size_label ?? ""}
                        onChange={(e) => {
                          const next = [...variants];
                          next[i] = { ...v, size_label: e.target.value || null };
                          setVariants(next);
                        }}
                        className="h-11 w-full rounded-lg border px-2 text-sm"
                      >
                        <option value="">Größe</option>
                        {SIZE_PRESETS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium text-slate-700">Einheitsgröße</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {(["qty_purchased", "qty_sold", "qty_gifted"] as const).map((field) => (
                        <label key={field} className="grid gap-0.5">
                          <span className="text-[10px] uppercase text-slate-500">
                            {field === "qty_purchased"
                              ? "Eingekauft"
                              : field === "qty_sold"
                                ? "Verkauft"
                                : "Geschenkt"}
                          </span>
                          <input
                            value={v[field] ? String(v[field]) : ""}
                            onChange={(e) => {
                              const next = [...variants];
                              next[i] = {
                                ...v,
                                [field]: Number(sanitizeDigitsInput(e.target.value)) || 0,
                              };
                              setVariants(next);
                            }}
                            className="h-11 rounded-lg border px-2 text-sm"
                            {...integerInputProps()}
                          />
                        </label>
                      ))}
                      <div className="col-span-2 text-sm font-semibold text-emerald-800">
                        Verfügbar: {available}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="border-b text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">{hasSizes ? "Größe" : "Variante"}</th>
                    <th className="px-4 py-2">Eingekauft</th>
                    <th className="px-4 py-2">Verkauft</th>
                    <th className="px-4 py-2">Geschenkt</th>
                    <th className="px-4 py-2">Verfügbar</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => {
                    const available = Math.max(0, v.qty_purchased - v.qty_sold - v.qty_gifted);
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          {hasSizes ? (
                            <select
                              value={v.size_label ?? ""}
                              onChange={(e) => {
                                const next = [...variants];
                                next[i] = { ...v, size_label: e.target.value || null };
                                setVariants(next);
                              }}
                              className="h-10 rounded-lg border px-2"
                            >
                              <option value="">Größe</option>
                              {SIZE_PRESETS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            "Einheitsgröße"
                          )}
                        </td>
                        {(["qty_purchased", "qty_sold", "qty_gifted"] as const).map((field) => (
                          <td key={field} className="px-4 py-2">
                            <input
                              value={v[field] ? String(v[field]) : ""}
                              onChange={(e) => {
                                const next = [...variants];
                                next[i] = {
                                  ...v,
                                  [field]: Number(sanitizeDigitsInput(e.target.value)) || 0,
                                };
                                setVariants(next);
                              }}
                              className="h-10 w-20 rounded-lg border px-2"
                              {...integerInputProps()}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2 font-semibold text-emerald-800">{available}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasSizes ? (
              <div className="border-t px-4 py-3">
                <button
                  type="button"
                  onClick={() =>
                    setVariants([
                      ...variants,
                      { size_label: "M", qty_purchased: 0, qty_sold: 0, qty_gifted: 0 },
                    ])
                  }
                  className="text-sm font-semibold text-fc-blue"
                >
                  + Größe hinzufügen
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !name.trim() || salePrice === ""}
              onClick={handleSave}
              className="h-11 rounded-xl bg-fc-navy px-6 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Speichern…" : "Speichern"}
            </button>
            <Link
              href={product ? `/admin/merchandise/${product.id}` : "/admin/merchandise"}
              className="inline-flex h-11 items-center rounded-xl border px-6 text-sm font-semibold"
            >
              Abbrechen
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
