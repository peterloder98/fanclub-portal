"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur } from "@/lib/club/ledger";
import { placeMerchandiseOrder } from "@/app/(app)/merchandise/actions";
import {
  listShopProductsAction,
  loadShopProfileAction,
  type ShopProduct,
} from "@/app/(app)/merchandise/shop-actions";

type CartLine = {
  productId: string;
  variantId: string | null;
  productName: string;
  sizeLabel: string | null;
  unitPriceCents: number;
  qty: number;
  maxQty: number;
};

const CART_KEY = "fanclub-merch-cart";

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function saveCart(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export function MerchandiseShop() {
  const router = useRouter();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    setCart(loadCart());
    void (async () => {
      setLoading(true);
      try {
        const [shop, profile] = await Promise.all([
          listShopProductsAction(),
          loadShopProfileAction(),
        ]);
        setTableMissing(shop.tableMissing);
        setProducts(shop.products);
        if (profile) {
          setFirstName(profile.first_name ?? "");
          setLastName(profile.last_name ?? "");
          setEmail(profile.email ?? "");
          setPhone(profile.phone ?? "");
          setStreet(profile.street ?? "");
          setPostalCode(profile.postal_code ?? "");
          setCity(profile.city ?? "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cartTotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPriceCents * l.qty, 0),
    [cart],
  );

  function updateCart(next: CartLine[]) {
    setCart(next);
    saveCart(next);
  }

  function addToCart(p: ShopProduct, variantId: string | null, sizeLabel: string | null) {
    const variant = variantId ? p.variants.find((v) => v.id === variantId) : p.variants[0];
    const maxQty = variant?.available ?? 0;
    if (maxQty <= 0) return;
    const resolvedVariantId = variantId ?? p.variants[0]?.id ?? null;
    const key = `${p.id}:${resolvedVariantId ?? "x"}`;
    const existing = cart.find(
      (l) => `${l.productId}:${l.variantId ?? "x"}` === key,
    );
    if (existing) {
      if (existing.qty >= maxQty) return;
      updateCart(
        cart.map((l) =>
          `${l.productId}:${l.variantId ?? "x"}` === key
            ? { ...l, qty: Math.min(l.qty + 1, maxQty) }
            : l,
        ),
      );
    } else {
      updateCart([
        ...cart,
        {
          productId: p.id,
          variantId: resolvedVariantId,
          productName: p.name,
          sizeLabel,
          unitPriceCents: p.sale_price_cents,
          qty: 1,
          maxQty,
        },
      ]);
    }
    setShowCart(true);
  }

  function placeOrder() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await placeMerchandiseOrder({
          lines: cart.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
          })),
          buyerFirstName: firstName,
          buyerLastName: lastName,
          buyerEmail: email,
          buyerPhone: phone || undefined,
          buyerStreet: street,
          buyerPostalCode: postalCode,
          buyerCity: city,
        });
        updateCart([]);
        setShowCart(false);
        setSuccess("Danke! Deine Bestellung ist eingegangen. Der Vorstand meldet sich bei dir.");
        const shop = await listShopProductsAction();
        setProducts(shop.products);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bestellung fehlgeschlagen");
      }
    });
  }

  if (tableMissing) {
    return (
      <p className="text-sm text-amber-800">
        Der Merchandise-Shop ist noch nicht eingerichtet (Migration 057 in Supabase ausführen).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Fanclub-Merchandise bestellen — Versand und Zahlung klärt der Vorstand mit dir.
        </p>
        <button
          type="button"
          onClick={() => setShowCart((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm"
        >
          <ShoppingCart className="h-4 w-4" />
          Warenkorb ({cart.length})
        </button>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}

      {showCart ? (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="space-y-4 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">Warenkorb & Bestellung</h2>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-600">Noch leer.</p>
            ) : (
              <>
                <ul className="space-y-2 text-sm">
                  {cart.map((l) => (
                    <li
                      key={`${l.productId}-${l.variantId}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2"
                    >
                      <span>
                        {l.qty}× {l.productName}
                        {l.sizeLabel ? ` (${l.sizeLabel})` : ""} — {formatEur(l.unitPriceCents * l.qty)}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={l.maxQty}
                          value={l.qty}
                          onChange={(e) => {
                            const q = Math.min(Math.max(1, Number(e.target.value) || 1), l.maxQty);
                            updateCart(cart.map((c) => (c === l ? { ...c, qty: q } : c)));
                          }}
                          className="h-8 w-14 rounded border px-2 text-center text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => updateCart(cart.filter((c) => c !== l))}
                          className="text-rose-600"
                          aria-label="Entfernen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-slate-900">Gesamt: {formatEur(cartTotal)}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Vorname *" className="h-10 rounded-lg border px-3 text-sm" />
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nachname *" className="h-10 rounded-lg border px-3 text-sm" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail *" className="h-10 rounded-lg border px-3 text-sm sm:col-span-2" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon (optional)" className="h-10 rounded-lg border px-3 text-sm sm:col-span-2" />
                  <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Straße & Hausnr. *" className="h-10 rounded-lg border px-3 text-sm sm:col-span-2" />
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="PLZ *" className="h-10 rounded-lg border px-3 text-sm" />
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ort *" className="h-10 rounded-lg border px-3 text-sm" />
                </div>

                <button
                  type="button"
                  disabled={pending || !cart.length || !firstName || !lastName || !email || !street || !postalCode || !city}
                  onClick={placeOrder}
                  className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-8"
                >
                  {pending ? "Wird gesendet…" : "Bestellen"}
                </button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-600">Lade Artikel…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-500">Aktuell nichts im Shop verfügbar.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="overflow-hidden shadow-sm">
              <div className="relative h-44 bg-slate-100">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-slate-400">Kein Foto</div>
                )}
                <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-slate-900 shadow">
                  {formatEur(p.sale_price_cents)}
                </span>
              </div>
              <CardContent className="pt-4">
                <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
                {p.description ? (
                  <p className="mt-1 text-xs text-slate-600">{p.description}</p>
                ) : null}
                <p className="mt-2 text-xs font-semibold text-emerald-800">
                  {p.total_available > 0 ? `${p.total_available} verfügbar` : "Ausverkauft"}
                </p>
                {p.has_sizes ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        disabled={v.available <= 0}
                        onClick={() => addToCart(p, v.id, v.size_label)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {v.size_label ?? "—"} ({v.available})
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={p.total_available <= 0}
                    onClick={() => addToCart(p, null, null)}
                    className="mt-3 h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    In den Warenkorb
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
