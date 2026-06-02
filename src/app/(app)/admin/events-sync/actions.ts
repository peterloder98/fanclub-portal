"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  await syncArtistflowEventsFromFeed(feedUrl);
  redirect("/admin/events-sync");
}

