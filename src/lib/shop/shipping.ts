/** Versandstaffel Shop (Werte in Cent). Hier zentral anpassen. */
export const SHOP_SHIPPING_DE = {
  /** Pauschalversand Deutschland */
  flatCents: 490,
  /** Ab diesem Warenwert versandkostenfrei (DE) */
  freeFromCents: 5000,
} as const;

export const SHOP_SHIPPING_INTL = {
  flatCents: 990,
} as const;

export type ShopShippingQuote = {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  label: string;
  hint: string;
  isFree: boolean;
};

function isGermany(country?: string | null) {
  const c = (country ?? "DE").trim().toUpperCase();
  return c === "DE" || c === "DEUTSCHLAND" || c === "GERMANY";
}

export function quoteShopShipping(
  subtotalCents: number,
  country?: string | null,
): ShopShippingQuote {
  const subtotal = Math.max(0, subtotalCents);

  if (isGermany(country)) {
    if (subtotal >= SHOP_SHIPPING_DE.freeFromCents) {
      return {
        subtotalCents: subtotal,
        shippingCents: 0,
        totalCents: subtotal,
        label: "Versandkostenfrei",
        hint: `Ab ${(SHOP_SHIPPING_DE.freeFromCents / 100).toFixed(0).replace(".", ",")} € Warenwert (Deutschland)`,
        isFree: true,
      };
    }
    return {
      subtotalCents: subtotal,
      shippingCents: SHOP_SHIPPING_DE.flatCents,
      totalCents: subtotal + SHOP_SHIPPING_DE.flatCents,
      label: "Standardversand Deutschland",
      hint: `Pauschal ${(SHOP_SHIPPING_DE.flatCents / 100).toFixed(2).replace(".", ",")} € · ab ${(SHOP_SHIPPING_DE.freeFromCents / 100).toFixed(0).replace(".", ",")} € versandkostenfrei`,
      isFree: false,
    };
  }

  return {
    subtotalCents: subtotal,
    shippingCents: SHOP_SHIPPING_INTL.flatCents,
    totalCents: subtotal + SHOP_SHIPPING_INTL.flatCents,
    label: "Versand ins Ausland",
    hint: `Pauschal ${(SHOP_SHIPPING_INTL.flatCents / 100).toFixed(2).replace(".", ",")} €`,
    isFree: false,
  };
}

/** Kurzer Hinweis für Produktseite / Shop-Header */
export function shopShippingPolicyShort(country?: string | null) {
  const q = quoteShopShipping(0, country);
  if (isGermany(country)) {
    return `Versand ${(SHOP_SHIPPING_DE.flatCents / 100).toFixed(2).replace(".", ",")} € (DE) · ab ${(SHOP_SHIPPING_DE.freeFromCents / 100).toFixed(0).replace(".", ",")} € versandkostenfrei`;
  }
  return q.hint;
}
