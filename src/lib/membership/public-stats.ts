import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function fetchPublicActiveMemberCount(): Promise<number | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { count, error } = await admin
      .from("memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "active");
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

/**
 * Öffentliche Marketing-Zahl („über 120“) — darf einige Minuten alt sein.
 * Keine personenbezogenen Daten; kein Cross-User-Leak.
 */
export const getPublicActiveMemberCount = unstable_cache(
  fetchPublicActiveMemberCount,
  ["public-active-member-count"],
  { revalidate: 600 },
);

/** Rounds down to nearest 10 for friendlier marketing copy, e.g. 127 → „über 120“. */
export function formatMemberCountLabel(count: number | null): string {
  if (count == null || count < 10) return "viele";
  const rounded = Math.floor(count / 10) * 10;
  return rounded > 0 ? `über ${rounded}` : String(count);
}
