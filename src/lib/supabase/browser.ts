import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabaseClient(params: {
  url: string;
  anonKey: string;
}) {
  return createClient(params.url, params.anonKey);
}

