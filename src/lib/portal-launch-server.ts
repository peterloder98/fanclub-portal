import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertMemberCanWrite } from "@/lib/portal-launch";

/**
 * Server-Actions: Schreibzugriff nur nach Soft-Launch (oder als Admin).
 * Wirft Error mit nutzerfreundlicher Meldung.
 */
export async function requireMemberWriteAccess() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  assertMemberCanWrite(profile?.role ?? "member");
  return { user, supabase, role: profile?.role ?? "member" };
}

/** Für Actions die `{ ok: false, error }` zurückgeben statt zu werfen. */
export async function checkMemberWriteAccess(): Promise<
  { ok: true; userId: string; role: string } | { ok: false; error: string }
> {
  try {
    const { user, role } = await requireMemberWriteAccess();
    return { ok: true, userId: user.id, role };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nicht erlaubt." };
  }
}
