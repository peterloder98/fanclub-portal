import { createClient } from "@supabase/supabase-js";
import { restoreVisibleEventsFromFeed } from "../src/lib/artistflow/restore-events-from-feed.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const feedUrl = process.env.ARTISTFLOW_FEED_URL;

if (!url || !key || !feedUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or ARTISTFLOW_FEED_URL");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const result = await restoreVisibleEventsFromFeed(admin, feedUrl);
console.log(JSON.stringify(result, null, 2));
