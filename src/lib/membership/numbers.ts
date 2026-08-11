import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MEMBERSHIP_NUMBER_PENDING_LABEL = "Wird nach Freigabe vergeben";

export function isAssignedMembershipNumber(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim();
  return Boolean(raw) && raw !== MEMBERSHIP_NUMBER_PENDING_LABEL;
}

/**
 * Atomare Vergabe der nächsten Mitgliedsnummer (DB-RPC + Counter-Zeile).
 * Fallback nur falls Migration 140 noch nicht angewendet wurde.
 */
export async function allocateNextMembershipNumber(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<string> {
  const { data, error } = await admin.rpc("allocate_next_membership_number");

  if (!error && data != null && String(data).trim()) {
    return String(data).trim();
  }

  if (error && !/allocate_next_membership_number|does not exist|PGRST202/i.test(error.message)) {
    throw new Error(error.message);
  }

  // Fallback (nicht race-sicher): Migration 140_membership_number_allocation.sql fehlt.
  console.warn(
    "[membership] allocate_next_membership_number RPC fehlt — Fallback max+1. Bitte supabase/140_membership_number_allocation.sql ausführen.",
  );

  const { data: rows, error: selErr } = await admin.from("profiles").select("membership_number");
  if (selErr) throw new Error(selErr.message);

  let max = 0;
  for (const row of rows ?? []) {
    const raw = String(row.membership_number ?? "").trim();
    if (!isAssignedMembershipNumber(raw)) continue;
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}
