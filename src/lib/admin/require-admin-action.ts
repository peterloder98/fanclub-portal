import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Für Server Actions: wirft Fehler statt redirect (vermeidet kryptische RSC-Fehler). */
export async function requireAdminAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet. Bitte erneut einloggen.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,email,first_name,last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    throw new Error("Keine Berechtigung (nur Admin).");
  }

  return { user, profile };
}
