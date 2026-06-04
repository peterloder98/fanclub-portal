import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeGermanPlz, isGermanCountry } from "@/lib/members/geocode-plz";

export async function geocodeProfileMapCoords(profile: {
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const plz = (profile.postal_code ?? "").replace(/\D/g, "").slice(0, 5);
  const city = (profile.city ?? "").trim();
  if (!plz || plz.length !== 5 || !isGermanCountry(profile.country)) return null;
  return geocodeGermanPlz(plz, city);
}

/** PLZ/Ort → map_lat/map_lng am Profil speichern (Mitglieder-Karte). */
export async function syncProfileMapCoords(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; lat?: number; lng?: number }> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("postal_code,city,country")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return { ok: false };

  const coords = await geocodeProfileMapCoords(profile);
  if (!coords) {
    await admin.from("profiles").update({ map_lat: null, map_lng: null }).eq("id", userId);
    return { ok: false };
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({ map_lat: coords.lat, map_lng: coords.lng })
    .eq("id", userId);
  if (upErr) return { ok: false };
  return { ok: true, lat: coords.lat, lng: coords.lng };
}
