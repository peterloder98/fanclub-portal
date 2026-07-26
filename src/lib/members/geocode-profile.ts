import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeGermanPlz, isGermanCountry } from "@/lib/members/geocode-plz";
import { normalizeMemberCountryCode, memberCountryLabel } from "@/lib/members/country";

export async function geocodeProfileMapCoords(profile: {
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const country = normalizeMemberCountryCode(profile.country);
  const city = (profile.city ?? "").trim();
  const street = (profile.street ?? "").trim();
  const postal = (profile.postal_code ?? "").replace(/\s+/g, "").trim();
  if (!postal && !city) return null;

  const { geocodeWithNominatim } = await import("@/lib/artistflow/geocode");
  const nom = await geocodeWithNominatim({
    address: street || undefined,
    postal_code: postal || undefined,
    city: city || postal || "—",
    country: memberCountryLabel(country),
    timeoutMs: 10_000,
  });
  if (nom.status === "success") {
    return { lat: nom.lat, lng: nom.lng };
  }

  if (isGermanCountry(country)) {
    const plz = postal.replace(/\D/g, "").slice(0, 5);
    if (plz.length === 5) return geocodeGermanPlz(plz, city);
  }

  return null;
}

/** Adresse → map_lat/map_lng am Profil speichern (Mitglieder-Karte). */
export async function syncProfileMapCoords(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; lat?: number; lng?: number }> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("street,postal_code,city,country")
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
