import type { BookkeepingStatus, PaymentMethod, PaymentStatus, PaymentType } from "@/lib/payments/types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Banküberweisung",
  paypal: "PayPal",
  stripe: "Stripe",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  open: "Offen",
  pending: "Ausstehend",
  simulated: "Simuliert (Testmodus)",
  paid: "Bezahlt",
  cancelled: "Storniert",
  failed: "Fehlgeschlagen",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  shop_order: "Shop-Bestellung",
  membership_fee: "Mitgliedsbeitrag",
  other: "Sonstiges",
};

export const BOOKKEEPING_STATUS_LABELS: Record<BookkeepingStatus, string> = {
  open: "Offen",
  paid: "Bezahlt (bestätigt)",
  cancelled: "Storniert",
};

export function paymentStatusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "open":
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "simulated":
      return "bg-sky-100 text-sky-900";
    case "cancelled":
      return "bg-slate-100 text-slate-600";
    case "failed":
      return "bg-rose-100 text-rose-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
