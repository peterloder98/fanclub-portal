import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-lokale Auth-Dedupe: Layout + Page teilen sich denselben getUser()-Aufruf.
 * Kein Cross-Request-Cache — Session bleibt pro Request frisch.
 */
export const getRequestAuth = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
}> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
