"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  saveAccountingSettings,
  getAccountingSettings,
  type AccountingSettings,
} from "@/lib/club/accounting-settings";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") throw new Error("Keine Berechtigung.");
  return user;
}

export async function loadAccountingSettingsAction(): Promise<AccountingSettings> {
  await requireAdmin();
  return getAccountingSettings();
}

export async function saveAccountingSetupAction(input: {
  startDate: string;
  openingBalanceEur: number;
}) {
  await requireAdmin();
  await saveAccountingSettings(input);

  const admin = createSupabaseAdminClient();
  const startDate = input.startDate.trim();

  await admin
    .from("club_ledger_entries")
    .update({ include_in_accounting: false })
    .eq("category", "membership");

  if (startDate) {
    await admin
      .from("club_ledger_entries")
      .update({ include_in_accounting: false })
      .lt("entry_date", startDate);
  }

  revalidatePath("/admin/accounting");
  return { ok: true as const };
}
