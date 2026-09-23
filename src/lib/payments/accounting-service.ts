import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookkeepingStatus, PaymentType } from "@/lib/payments/types";
import type { LedgerCategory } from "@/lib/club/ledger";
import { includeInAccountingForCategory } from "@/lib/club/accounting-settings";

function ledgerCategoryForPaymentType(paymentType: PaymentType): LedgerCategory {
  if (paymentType === "membership_fee") return "membership";
  return "general";
}

function membershipDescription(firstName: string | null, lastName: string | null, internalReference: string) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return `Mitgliedsbeitrag${name ? ` · ${name}` : ""} · ${internalReference}`;
}

/**
 * Früher: Vor-Buchung mit Status „open“ schon bei Zahlungsanlage.
 * Neu: Buchhaltung erst nach Bestätigung — offene Posten leben nur unter Admin → Zahlungen.
 * @deprecated Nicht mehr aufrufen; bleibt für Tests/Migrationen.
 */
export async function createOpenAccountingEntry(input: {
  admin: SupabaseClient;
  paymentId: string;
  userId: string;
  orderId?: string | null;
  paymentType: PaymentType;
  amountCents: number;
  description: string;
  internalReference: string;
}) {
  const { admin, paymentId, userId, orderId, paymentType, amountCents, description, internalReference } =
    input;

  const category = ledgerCategoryForPaymentType(paymentType);

  const { data, error } = await admin
    .from("club_ledger_entries")
    .insert({
      entry_type: "income",
      amount_cents: amountCents,
      description: `${description} · ${internalReference}`,
      category,
      member_id: userId,
      entry_date: new Date().toISOString().slice(0, 10),
      payment_id: paymentId,
      order_id: orderId ?? null,
      bookkeeping_status: "open" satisfies BookkeepingStatus,
      include_in_accounting: includeInAccountingForCategory(category),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function confirmAccountingEntry(input: {
  admin: SupabaseClient;
  paymentId: string;
  confirmedBy: string;
  entryDate: string;
  amountCents?: number;
}) {
  const { admin, paymentId, confirmedBy, entryDate, amountCents } = input;

  const { data: existing, error: findErr } = await admin
    .from("club_ledger_entries")
    .select("id")
    .eq("payment_id", paymentId)
    .or("bookkeeping_status.is.null,bookkeeping_status.eq.open,bookkeeping_status.eq.paid")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing?.id) {
    const patch: {
      bookkeeping_status: BookkeepingStatus;
      entry_date: string;
      created_by: string;
      include_in_accounting: boolean;
      amount_cents?: number;
    } = {
      bookkeeping_status: "paid",
      entry_date: entryDate,
      created_by: confirmedBy,
      include_in_accounting: true,
    };
    if (typeof amountCents === "number" && amountCents > 0) {
      patch.amount_cents = amountCents;
    }
    const { error } = await admin.from("club_ledger_entries").update(patch).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return existing.id as string;
  }

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .select("id,user_id,order_id,amount_cents,payment_type,internal_reference")
    .eq("id", paymentId)
    .maybeSingle();
  if (payErr) throw new Error(payErr.message);
  if (!payment) throw new Error("Zahlung nicht gefunden.");

  const paymentType = payment.payment_type as PaymentType;
  const category = ledgerCategoryForPaymentType(paymentType);
  const cents =
    typeof amountCents === "number" && amountCents > 0
      ? amountCents
      : (payment.amount_cents as number);

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", payment.user_id)
    .maybeSingle();

  const description =
    paymentType === "membership_fee"
      ? membershipDescription(
          profile?.first_name ?? null,
          profile?.last_name ?? null,
          payment.internal_reference as string,
        )
      : `Zahlung · ${payment.internal_reference}`;

  const { data: created, error: insErr } = await admin
    .from("club_ledger_entries")
    .insert({
      entry_type: "income",
      amount_cents: cents,
      description,
      category,
      member_id: payment.user_id,
      entry_date: entryDate,
      created_by: confirmedBy,
      payment_id: paymentId,
      order_id: payment.order_id ?? null,
      bookkeeping_status: "paid" satisfies BookkeepingStatus,
      include_in_accounting: true,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);
  return created.id as string;
}

export async function cancelAccountingEntry(input: {
  admin: SupabaseClient;
  paymentId: string;
}) {
  const { admin, paymentId } = input;
  const { error } = await admin
    .from("club_ledger_entries")
    .update({ bookkeeping_status: "cancelled" satisfies BookkeepingStatus })
    .eq("payment_id", paymentId)
    .in("bookkeeping_status", ["open", "paid"]);

  if (error) throw new Error(error.message);
}

/**
 * Entfernt Vor-Buchungen offener (noch nicht bezahlter) Zahlungen aus der Kasse.
 * Die Zahlungsdatensätze unter Admin → Zahlungen bleiben erhalten.
 */
export async function purgeOpenLedgerEntriesForUnpaidPayments(admin: SupabaseClient): Promise<number> {
  const { data: openRows, error } = await admin
    .from("club_ledger_entries")
    .select("id,payment_id")
    .eq("bookkeeping_status", "open")
    .not("payment_id", "is", null);
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) return 0;
    throw new Error(error.message);
  }
  if (!openRows?.length) return 0;

  const paymentIds = Array.from(
    new Set(openRows.map((r) => r.payment_id).filter(Boolean)),
  ) as string[];

  const { data: payments, error: payErr } = await admin
    .from("payments")
    .select("id,payment_status")
    .in("id", paymentIds);
  if (payErr) throw new Error(payErr.message);

  const paidIds = new Set(
    (payments ?? []).filter((p) => p.payment_status === "paid").map((p) => p.id),
  );

  const toDelete = openRows
    .filter((r) => r.payment_id && !paidIds.has(r.payment_id))
    .map((r) => r.id);

  if (!toDelete.length) return 0;

  const { error: delErr } = await admin.from("club_ledger_entries").delete().in("id", toDelete);
  if (delErr) throw new Error(delErr.message);
  return toDelete.length;
}
