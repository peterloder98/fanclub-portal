import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Request-lokale Auth-Dedupe: Layout + Page + requireAdmin teilen sich denselben getUser()-Aufruf.
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

export type RequestMeProfile = {
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  email: string | null;
  avatar_path: string | null;
  updated_at: string | null;
  intro_onboarding_dismissed_at: string | null;
  community_rules_accepted_at: string | null;
};

/**
 * Request-lokales Profil des aktuellen Users (Layout + Admin-Gates + Seiten).
 * Eine Query pro Request — Sicherheit unverändert (immer frische DB-Daten).
 */
export const getRequestMeProfile = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  profile: RequestMeProfile | null;
}> => {
  const { supabase, user } = await getRequestAuth();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "first_name,last_name,role,email,avatar_path,updated_at,intro_onboarding_dismissed_at,community_rules_accepted_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    return { supabase, user, profile: profile as RequestMeProfile };
  }

  // Spalte fehlt ggf. vor Migration → ohne Intro-Felder erneut laden
  if (profileError) {
    const { data: fallback } = await supabase
      .from("profiles")
      .select("first_name,last_name,role,email,avatar_path,updated_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!fallback) return { supabase, user, profile: null };
    return {
      supabase,
      user,
      profile: {
        ...(fallback as Omit<
          RequestMeProfile,
          "intro_onboarding_dismissed_at" | "community_rules_accepted_at"
        >),
        intro_onboarding_dismissed_at: null,
        community_rules_accepted_at: null,
      },
    };
  }

  return { supabase, user, profile: null };
});
