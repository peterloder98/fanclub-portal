import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Höchstens ein fixierter Beitrag. Behält den zuletzt fixierten.
 * Klappt still fehl, wenn die Session keine Admin-Rechte hat.
 */
export async function collapseExtraPinnedPosts(
  supabase: SupabaseClient,
): Promise<void> {
  const { data, error } = await supabase
    .from("posts")
    .select("id,pinned_at,created_at")
    .eq("is_pinned", true)
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data || data.length <= 1) return;

  const keepId = data[0]?.id;
  if (!keepId) return;
  const dropIds = data.slice(1).map((row) => row.id).filter(Boolean);
  if (!dropIds.length) return;

  await supabase
    .from("posts")
    .update({ is_pinned: false, pinned_at: null, pinned_by: null })
    .in("id", dropIds);
}

/**
 * Dashboard-Aufruf: erst die DB-Funktion (nach Migration), sonst die Admin-Session.
 * Eine Abfrage, kein zweiter Durchlauf wenn schon nur ein Pin existiert.
 */
export async function collapseExtraPinnedPostsOnDashboard(input: {
  supabase: SupabaseClient;
  isAdmin: boolean;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const rpc = await admin.rpc("posts_collapse_extra_pins");
    if (!rpc.error) return;
  } catch {
    /* Funktion noch nicht migriert oder Service-Role blockiert */
  }
  if (!input.isAdmin) return;
  await collapseExtraPinnedPosts(input.supabase);
}
