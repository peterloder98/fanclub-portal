"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { geocodeAllPendingArtistflowEvents } from "@/lib/artistflow/geocode-event";
import { syncArtistflowEventsFromFeed } from "@/lib/artistflow/sync";

export async function runArtistflowSync() {
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

  const feedUrl = process.env.ARTISTFLOW_FEED_URL;
  if (!feedUrl) {
    throw new Error("Missing ARTISTFLOW_FEED_URL in .env.local");
  }

  try {
    await syncArtistflowEventsFromFeed(feedUrl);
    redirect("/admin/events-sync?ok=1");
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "sync_failed");
    redirect(`/admin/events-sync?error=${msg}`);
  }
}

export async function runArtistflowGeocodeBackfill() {
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

  const admin = createSupabaseAdminClient();
  await admin
    .from("external_events")
    .update({ geocoding_status: "pending" })
    .eq("source", "artistflow")
    .neq("kind", "tv")
    .is("lat", null)
    .not("city", "is", null)
    .eq("is_visible", true);

  const geocoded = await geocodeAllPendingArtistflowEvents(admin);
  redirect(`/admin/events-sync?ok=1&geocoded=${geocoded}`);
}

