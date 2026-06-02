export type GeocodeResult =
  | { status: "success"; lat: number; lng: number }
  | { status: "failed" };

export async function geocodeWithNominatim(params: {
  address?: string | null;
  postal_code?: string | null;
  city: string;
  country: string;
  timeoutMs?: number;
}): Promise<GeocodeResult> {
  const timeoutMs = params.timeoutMs ?? 8000;
  const query = [
    (params.address ?? "").trim(),
    params.postal_code ?? "",
    params.city,
    params.country,
  ]
    .filter(Boolean)
    .join(", ");

  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "json");
  u.searchParams.set("limit", "1");
  u.searchParams.set("q", query);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(u, {
      headers: {
        // Nominatim usage policy expects a UA
        "User-Agent": "AnniPerkaFanclubPortal/0.1 (dev)",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { status: "failed" };
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = data?.[0];
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { status: "failed" };
    return { status: "success", lat, lng };
  } catch {
    return { status: "failed" };
  } finally {
    clearTimeout(t);
  }
}

