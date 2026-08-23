import { getRequestMeProfile } from "@/lib/auth/request-auth";

/** Für Server Actions: wirft Fehler statt redirect (vermeidet kryptische RSC-Fehler). */
export async function requireAdminAction() {
  const { user, profile } = await getRequestMeProfile();
  if (!user) throw new Error("Nicht angemeldet. Bitte erneut einloggen.");

  if (profile?.role !== "admin") {
    throw new Error("Keine Berechtigung (nur Admin).");
  }

  return {
    user,
    profile: {
      role: profile.role,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
    },
  };
}
