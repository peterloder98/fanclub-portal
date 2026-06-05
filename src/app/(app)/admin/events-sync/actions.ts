"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { geocodeAllPendingArtistflowEvents } from "@/lib/artistflow/geocode-event";
import { relinkOrphanedPortalEventData } from "@/lib/artistflow/relink-portal-event-data";
import { syncArtistflowEventsFromFeed } from "@/lib/artistflow/sync";
import type { SyncLogSnapshot } from "./events-sync-panel.client";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");
}

async function latestSyncLog(): Promise<SyncLogSnapshot | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("artistflow_sync_logs")
    .select("started_at,finished_at,total,inserted,updated,hidden,geocoding_queued,error")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function runArtistflowSync(): Promise<
  { ok: true; log: SyncLogSnapshot | null } | { ok: false; error: string }
> {
  await requireAdmin();

  const feedUrl = process.env.ARTISTFLOW_FEED_URL;
  if (!feedUrl) {
    return { ok: false, error: "Missing ARTISTFLOW_FEED_URL in .env.local" };
  }

  try {
    await syncArtistflowEventsFromFeed(feedUrl);
    const log = await latestSyncLog();
    return { ok: true, log };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "sync_failed",
    };
  }
}

export async function runArtistflowGeocodeBackfill(): Promise<
  | { ok: true; geocoded: number; relinked: number }
  | { ok: false; error: string }
> {
  await requireAdmin();

  const admin = createSupabaseAdminClient();
  try {
    await admin
      .from("external_events")
      .update({ geocoding_status: "pending" })
      .eq("source", "artistflow")
      .neq("kind", "tv")
      .is("lat", null)
      .not("city", "is", null)
      .eq("is_visible", true);

    const relinked = await relinkOrphanedPortalEventData(admin);
    const geocoded = await geocodeAllPendingArtistflowEvents(admin);
    return {
      ok: true,
      geocoded,
      relinked: relinked.participationsMoved + relinked.travelNotesMoved,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "geocode_failed" };
  }
}
