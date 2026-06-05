import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncArtistflowEventsFromFeed } from "@/lib/artistflow/sync";

/** Mindestabstand zwischen automatischen Syncs (Seitenbesuch / Cron). */
const STALE_MS = 2 * 60 * 60 * 1000;

/** Laufender Sync gilt als hängend nach dieser Zeit. */
const RUNNING_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Holt termine.json nach, wenn der letzte erfolgreiche Sync älter als STALE_MS ist.
 * Wird im Hintergrund nach Seitenaufruf (Events/Dashboard) ausgeführt.
 */
export async function maybeSyncArtistflowIfStale(): Promise<void> {
  const feedUrl = process.env.ARTISTFLOW_FEED_URL?.trim();
  if (!feedUrl) return;

  const admin = createSupabaseAdminClient();
  const { data: last, error } = await admin
    .from("artistflow_sync_logs")
    .select("started_at, finished_at, error")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[artistflow] stale-check failed:", error.message);
    return;
  }

  const now = Date.now();

  if (last?.started_at && !last.finished_at) {
    const runningFor = now - new Date(last.started_at).getTime();
    if (runningFor < RUNNING_TIMEOUT_MS) return;
  }

  if (last?.finished_at && !last.error) {
    const age = now - new Date(last.finished_at).getTime();
    if (age < STALE_MS) return;
  }

  try {
    await syncArtistflowEventsFromFeed(feedUrl);
  } catch (e) {
    console.error("[artistflow] stale sync failed:", e);
  }
}
