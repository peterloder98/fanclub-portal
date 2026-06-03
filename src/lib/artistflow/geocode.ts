export type GeocodeResult =
  | { status: "success"; lat: number; lng: number }
  | { status: "failed" };

function buildQueries(params: {
  address?: string | null;
  postal_code?: string | null;
  city: string;
  country: string;
}): string[] {
  const city = params.city.trim();
  const country = params.country.trim() || "Deutschland";
  const address = (params.address ?? "").trim();
  const venue = address;
  const queries = [
    [address, params.postal_code, city, country].filter(Boolean).join(", "),
    [params.postal_code, city, country].filter(Boolean).join(", "),
    `${city}, ${country}`,
  ];
  if (/löwenberg/i.test(city) || /löwenberg/i.test(venue)) {
    queries.unshift("Löwenberger Land, Brandenburg, Deutschland");
    queries.unshift("Löwenberg, Brandenburg, Deutschland");
  }
  if (/elisabethszell/i.test(city) || /elisabethszell/i.test(venue)) {
    queries.unshift("Elisabethszell, Bayern, Deutschland");
  }
  return [...new Set(queries.filter(Boolean))];
}

async function nominatimSearch(q: string, timeoutMs: number): Promise<GeocodeResult> {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("format", "json");
  u.searchParams.set("limit", "1");
  u.searchParams.set("q", q);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(u, {
      headers: {
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

export async function geocodeWithNominatim(params: {
  address?: string | null;
  postal_code?: string | null;
  city: string;
  country: string;
  timeoutMs?: number;
}): Promise<GeocodeResult> {
  const timeoutMs = params.timeoutMs ?? 8000;
  const queries = buildQueries(params);
  for (const q of queries) {
    const result = await nominatimSearch(q, timeoutMs);
    if (result.status === "success") return result;
  }
  return { status: "failed" };
}

