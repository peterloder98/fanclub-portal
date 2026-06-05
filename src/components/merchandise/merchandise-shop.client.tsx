"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur } from "@/lib/club/ledger";
import { cn } from "@/lib/cn";
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
  imageUrl: string | null;
};

type ShopView = "catalog" | "detail" | "checkout";

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

function ProductCatalogCard({
  product,
  onOpen,
}: {
  product: ShopProduct;
  onOpen: () => void;
}) {
  const soldOut = product.total_available <= 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm shadow-slate-900/5 transition",
        "hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        soldOut && "opacity-75",
      )}
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-400">Kein Foto</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-bold text-white">
          {formatEur(product.sale_price_cents)}
        </span>
        {soldOut ? (
          <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">
            Ausverkauft
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow">
            {product.total_available} verfügbar
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-700">
          {product.name}
        </h3>
        {product.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-slate-600">{product.description}</p>
        ) : null}
        <p className="mt-3 text-xs font-semibold text-blue-700 group-hover:underline">
          Artikel ansehen →
        </p>
      </div>
    </button>
  );
}

function ProductDetailView({
  product,
  onBack,
  onAdded,
}: {
  product: ShopProduct;
  onBack: () => void;
  onAdded: (message: string) => void;
}) {
  const [cart, setCart] = useState<CartLine[]>(loadCart);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.has_sizes ? null : product.variants[0]?.id ?? null,
  );
  const [qty, setQty] = useState(1);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const maxQty = selectedVariant?.available ?? 0;
  const soldOut = product.total_available <= 0;
  const needsSize = product.has_sizes && !selectedVariantId;
  const canAdd = !soldOut && !needsSize && maxQty > 0 && qty >= 1 && qty <= maxQty;

  useEffect(() => {
    setQty(1);
  }, [selectedVariantId]);

  useEffect(() => {
    if (qty > maxQty && maxQty > 0) setQty(maxQty);
  }, [maxQty, qty]);

  function addToCart() {
    if (!canAdd || !selectedVariantId) return;
    const key = `${product.id}:${selectedVariantId}`;
    const existing = cart.find(
      (l) => `${l.productId}:${l.variantId ?? "x"}` === key,
    );
    let next: CartLine[];
    if (existing) {
      const newQty = Math.min(existing.qty + qty, maxQty);
      if (newQty === existing.qty) {
        onAdded(`Maximal ${maxQty}× „${product.name}" verfügbar.`);
        return;
      }
      next = cart.map((l) =>
        `${l.productId}:${l.variantId ?? "x"}` === key ? { ...l, qty: newQty, maxQty } : l,
      );
    } else {
      next = [
        ...cart,
        {
          productId: product.id,
          variantId: selectedVariantId,
          productName: product.name,
          sizeLabel: selectedVariant?.size_label ?? null,
          unitPriceCents: product.sale_price_cents,
          qty,
          maxQty,
          imageUrl: product.image_url,
        },
      ];
    }
    setCart(next);
    saveCart(next);
    const sizePart = selectedVariant?.size_label ? `, Größe ${selectedVariant.size_label}` : "";
    onAdded(`${qty}× „${product.name}"${sizePart} liegt im Warenkorb.`);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Zurück zum Shop
      </button>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="relative aspect-square bg-slate-100 lg:aspect-auto lg:min-h-[420px]">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full min-h-[280px] place-items-center text-sm text-slate-400">
                Kein Produktfoto
              </div>
            )}
          </div>

          <div className="flex flex-col p-6 lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fanclub Merchandise
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{product.name}</h2>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatEur(product.sale_price_cents)}
            </p>
            {product.description ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.description}</p>
            ) : null}

            {product.has_sizes ? (
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-900">
                  Größe wählen <span className="text-rose-600">*</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Bitte zuerst deine Größe auswählen, dann die Menge festlegen.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const active = selectedVariantId === v.id;
                    const disabled = v.available <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={cn(
                          "min-w-[3.5rem] rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-400",
                          disabled && "cursor-not-allowed opacity-40",
                        )}
                      >
                        {v.size_label ?? "—"}
                        <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                          {v.available > 0 ? `${v.available} frei` : "weg"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-600">
                {soldOut ? (
                  <span className="font-semibold text-rose-700">Derzeit ausverkauft</span>
                ) : (
                  <span>
                    <span className="font-semibold text-emerald-800">{maxQty} Stück</span> verfügbar
                  </span>
                )}
              </p>
            )}

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-900">Menge</p>
              <div className="mt-2 inline-flex items-center rounded-xl border bg-slate-50">
                <button
                  type="button"
                  disabled={!canAdd || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-11 w-11 place-items-center text-slate-700 disabled:opacity-40"
                  aria-label="Menge verringern"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2.5rem] text-center text-base font-bold tabular-nums text-slate-900">
                  {qty}
                </span>
                <button
                  type="button"
                  disabled={!canAdd || qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="grid h-11 w-11 place-items-center text-slate-700 disabled:opacity-40"
                  aria-label="Menge erhöhen"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {maxQty > 0 && selectedVariantId ? (
                <p className="mt-1 text-xs text-slate-500">Max. {maxQty} Stück wählbar</p>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Zwischensumme</span>
                <span className="font-semibold text-slate-900">
                  {formatEur(product.sale_price_cents * qty)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!canAdd}
              onClick={addToCart}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingCart className="h-4 w-4" />
              In den Warenkorb legen
            </button>

            {needsSize ? (
              <p className="mt-2 text-center text-xs text-amber-700">
                Bitte zuerst eine Größe auswählen.
              </p>
            ) : null}

            <p className="mt-4 text-xs text-slate-500">
              Versand und Zahlung werden nach der Bestellung mit dem Vorstand abgestimmt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MerchandiseShop() {
  const router = useRouter();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [view, setView] = useState<ShopView>("catalog");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [cartBump, setCartBump] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

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
          setProfileLoaded(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!addNotice) return;
    const t = setTimeout(() => setAddNotice(null), 5000);
    return () => clearTimeout(t);
  }, [addNotice]);

  const cartTotal = useMemo(
    () => cart.reduce((s, l) => s + l.unitPriceCents * l.qty, 0),
    [cart],
  );
  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  function updateCart(next: CartLine[]) {
    setCart(next);
    saveCart(next);
  }

  function handleAddedToCart(message: string) {
    setCart(loadCart());
    setAddNotice(message);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 600);
  }

  function openProduct(id: string) {
    setSelectedProductId(id);
    setView("detail");
    setAddNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        setView("catalog");
        setSelectedProductId(null);
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
    <div className="relative space-y-6 pb-24">
      {/* Shop-Header */}
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <ShoppingBag className="h-3.5 w-3.5" />
              Offizieller Fanclub-Shop
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Merchandise entdecken & bestellen
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Schau dir Artikel in Ruhe an, wähle Größe und Menge — erst dann legst du bewusst in
              den Warenkorb. Versand und Zahlung klärt der Vorstand mit dir.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setView("checkout");
              setError(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow transition",
              cartBump && "scale-105",
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            Warenkorb
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
              {cartCount}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}
      {addNotice ? (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{addNotice}</span>
          <button
            type="button"
            onClick={() => setView("checkout")}
            className="ml-auto shrink-0 text-xs font-bold underline"
          >
            Zum Warenkorb
          </button>
        </div>
      ) : null}

      {view === "checkout" ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setView(selectedProductId ? "detail" : "catalog");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Weiter einkaufen
          </button>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardContent className="space-y-4 pt-6">
                <h2 className="text-lg font-bold text-slate-900">Dein Warenkorb</h2>
                {cart.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-10 text-center">
                    <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-600">Noch keine Artikel im Warenkorb.</p>
                    <button
                      type="button"
                      onClick={() => setView("catalog")}
                      className="mt-4 text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Zum Shop
                    </button>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {cart.map((l) => (
                        <li
                          key={`${l.productId}-${l.variantId}`}
                          className="flex gap-3 rounded-xl border bg-white p-3"
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {l.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">{l.productName}</p>
                            {l.sizeLabel ? (
                              <p className="text-xs text-slate-500">Größe {l.sizeLabel}</p>
                            ) : null}
                            <p className="text-xs text-slate-500">
                              {formatEur(l.unitPriceCents)} / Stück
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="inline-flex items-center rounded-lg border">
                                <button
                                  type="button"
                                  disabled={l.qty <= 1}
                                  onClick={() => {
                                    const q = l.qty - 1;
                                    updateCart(
                                      cart.map((c) => (c === l ? { ...c, qty: q } : c)),
                                    );
                                  }}
                                  className="grid h-8 w-8 place-items-center disabled:opacity-40"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-[1.5rem] text-center text-sm font-bold">
                                  {l.qty}
                                </span>
                                <button
                                  type="button"
                                  disabled={l.qty >= l.maxQty}
                                  onClick={() => {
                                    const q = Math.min(l.maxQty, l.qty + 1);
                                    updateCart(
                                      cart.map((c) => (c === l ? { ...c, qty: q } : c)),
                                    );
                                  }}
                                  className="grid h-8 w-8 place-items-center disabled:opacity-40"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <span className="text-sm font-bold tabular-nums">
                                {formatEur(l.unitPriceCents * l.qty)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateCart(cart.filter((c) => c !== l))}
                            className="shrink-0 self-start text-rose-600"
                            aria-label="Entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-base font-bold text-slate-900">
                        <span>Gesamt</span>
                        <span>{formatEur(cartTotal)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">zzgl. Versand nach Absprache</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardContent className="space-y-4 pt-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Lieferadresse & Kontakt</h2>
                  {profileLoaded ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Aus deinem Profil vorausgefüllt — du kannst alles hier anpassen.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">Vorname *</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">Nachname *</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">E-Mail *</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Telefon (optional)</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Straße & Hausnr. *</span>
                    <input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">PLZ *</span>
                    <input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">Ort *</span>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-11 rounded-xl border px-3 text-sm"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={
                    pending ||
                    !cart.length ||
                    !firstName ||
                    !lastName ||
                    !email ||
                    !street ||
                    !postalCode ||
                    !city
                  }
                  onClick={placeOrder}
                  className="h-12 w-full rounded-xl bg-slate-900 text-sm font-bold text-white disabled:opacity-50 sm:max-w-xs"
                >
                  {pending ? "Bestellung wird gesendet…" : "Jetzt bestellen"}
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : view === "detail" && selectedProduct ? (
        <ProductDetailView
          product={selectedProduct}
          onBack={() => {
            setView("catalog");
            setSelectedProductId(null);
          }}
          onAdded={handleAddedToCart}
        />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-slate-50 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">Aktuell nichts im Shop verfügbar.</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-600">
            {products.length} {products.length === 1 ? "Artikel" : "Artikel"} — tippe zum Ansehen
          </p>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCatalogCard key={p.id} product={p} onOpen={() => openProduct(p.id)} />
            ))}
          </div>
        </>
      )}

      {cartCount > 0 && view !== "checkout" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-bold text-slate-900">{cartCount} Artikel</span>
              <span className="text-slate-500"> · {formatEur(cartTotal)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setView("checkout");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-bold text-white"
            >
              Zur Kasse
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
