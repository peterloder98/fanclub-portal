import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeGermanPlz, isGermanCountry } from "@/lib/members/geocode-plz";
import { normalizeMemberCountryCode, memberCountryLabel } from "@/lib/members/country";
import { snapToRegionalCenter } from "@/lib/members/regional-centers";

/**
 * Grobe Kartenkoordinaten für die Mitglieder-Karte.
 * Niemals Straße/Hausnummer — nur Ort/PLZ, danach Snap auf nächstes Regionalzentrum.
 */
export async function geocodeProfileMapCoords(profile: {
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<{ lat: number; lng: number; regionId: string; regionName: string } | null> {
  const country = normalizeMemberCountryCode(profile.country);
  const city = (profile.city ?? "").trim();
  const postal = (profile.postal_code ?? "").replace(/\s+/g, "").trim();
  if (!postal && !city) return null;

  let rough: { lat: number; lng: number } | null = null;

  // 1) DE: PLZ-Centroid (kein Straßenbezug), sonst Stadtname ohne Straße
  if (isGermanCountry(country)) {
    const plz = postal.replace(/\D/g, "").slice(0, 5);
    if (plz.length === 5) {
      rough = await geocodeGermanPlz(plz, city || undefined);
    }
  }

  if (!rough) {
    const { geocodeWithNominatim } = await import("@/lib/artistflow/geocode");
    const nom = await geocodeWithNominatim({
      // bewusst ohne address/street
      postal_code: postal || undefined,
      city: city || postal || "—",
      country: memberCountryLabel(country),
      timeoutMs: 10_000,
    });
    if (nom.status === "success") {
      rough = { lat: nom.lat, lng: nom.lng };
    }
  }

  if (!rough) return null;

  const center = snapToRegionalCenter(rough.lat, rough.lng, city || null);
  return {
    lat: center.lat,
    lng: center.lng,
    regionId: center.id,
    regionName: center.name,
  };
}

/** PLZ/Ort → grobe map_lat/map_lng am Profil (Mitglieder-Karte, Datenschutz). */
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
