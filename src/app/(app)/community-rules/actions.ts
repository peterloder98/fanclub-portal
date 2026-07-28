"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function acceptCommunityRules(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht angemeldet." };

  const { error } = await supabase
    .from("profiles")
    .update({ community_rules_accepted_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    if (/community_rules_accepted_at|column/i.test(error.message)) {
      return {
        ok: false,
        error:
          "Datenbank-Migration fehlt. Bitte supabase/114_community_rules_accepted.sql ausführen.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
