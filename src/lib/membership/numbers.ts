import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MEMBERSHIP_NUMBER_PENDING_LABEL = "Wird nach Freigabe vergeben";

export async function allocateNextMembershipNumber(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<string> {
  const { data, error } = await admin.from("profiles").select("membership_number");
  if (error) throw new Error(error.message);

  let max = 0;
  for (const row of data ?? []) {
    const raw = String(row.membership_number ?? "").trim();
    if (!raw || raw === MEMBERSHIP_NUMBER_PENDING_LABEL) continue;
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}
