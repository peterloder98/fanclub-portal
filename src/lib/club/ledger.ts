import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LedgerEntryType = "income" | "expense";
export type LedgerCategory =
  | "membership"
  | "merchandise"
  | "event"
  | "general"
  | "other";

export type ClubLedgerRow = {
  id: string;
  entry_type: LedgerEntryType;
  amount_cents: number;
  description: string;
  category: LedgerCategory;
  member_id: string | null;
  member_name: string | null;
  entry_date: string;
  created_at: string;
  created_by_name: string | null;
};

export const LEDGER_CATEGORY_LABELS: Record<LedgerCategory, string> = {
  membership: "Mitgliedsbeitrag",
  merchandise: "Merchandise",
  event: "Event",
  general: "Allgemein",
  other: "Sonstiges",
};

export function formatEur(cents: number) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export type LedgerPeriodMode = "all" | "year" | "month";

export function sumLedgerRows(rows: Pick<ClubLedgerRow, "entry_type" | "amount_cents">[]) {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const r of rows) {
    if (r.entry_type === "income") incomeCents += r.amount_cents;
    else expenseCents += r.amount_cents;
  }
  return { incomeCents, expenseCents };
}

export function filterLedgerByPeriod(
  rows: ClubLedgerRow[],
  mode: LedgerPeriodMode,
  year: number,
  month: number,
): ClubLedgerRow[] {
  if (mode === "all") return rows;
  return rows.filter((r) => {
    const [y, m] = r.entry_date.split("-").map(Number);
    if (mode === "year") return y === year;
    return y === year && m === month;
  });
}

export function ledgerYearOptions(rows: ClubLedgerRow[]): number[] {
  const years = new Set<number>();
  for (const r of rows) {
    const y = Number(r.entry_date.slice(0, 4));
    if (!Number.isNaN(y)) years.add(y);
  }
  if (!years.size) years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

export async function listClubLedger(opts?: {
  memberId?: string | null;
  limit?: number;
}): Promise<ClubLedgerRow[]> {
  const admin = createSupabaseAdminClient();
  let q = admin
    .from("club_ledger_entries")
    .select(
      "id,entry_type,amount_cents,description,category,member_id,entry_date,created_at,created_by",
    )
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.memberId) q = q.eq("member_id", opts.memberId);

  const { data, error } = await q;
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  const memberIds = Array.from(
    new Set((data ?? []).map((r) => r.member_id).filter(Boolean)),
  ) as string[];
  const creatorIds = Array.from(
    new Set((data ?? []).map((r) => r.created_by).filter(Boolean)),
  ) as string[];
  const profileIds = Array.from(new Set([...memberIds, ...creatorIds]));

  const { data: profiles } = profileIds.length
    ? await admin
        .from("profiles")
        .select("id,first_name,last_name")
        .in("id", profileIds)
    : { data: [] };

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—",
    ]),
  );

  return (data ?? []).map((r) => ({
    id: r.id,
    entry_type: r.entry_type as LedgerEntryType,
    amount_cents: r.amount_cents,
    description: r.description,
    category: r.category as LedgerCategory,
    member_id: r.member_id,
    member_name: r.member_id ? (nameById.get(r.member_id) ?? null) : null,
    entry_date: r.entry_date,
    created_at: r.created_at,
    created_by_name: r.created_by ? (nameById.get(r.created_by) ?? null) : null,
  }));
}

export async function sumClubLedger(): Promise<{
  incomeCents: number;
  expenseCents: number;
}> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("club_ledger_entries")
    .select("entry_type,amount_cents");
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) {
      return { incomeCents: 0, expenseCents: 0 };
    }
    throw new Error(error.message);
  }
  let incomeCents = 0;
  let expenseCents = 0;
  for (const r of data ?? []) {
    if (r.entry_type === "income") incomeCents += r.amount_cents;
    else expenseCents += r.amount_cents;
  }
  return { incomeCents, expenseCents };
}
