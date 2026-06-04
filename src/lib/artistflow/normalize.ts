import crypto from "node:crypto";

export type ArtistflowFeedItem = Record<string, unknown>;

export type NormalizedExternalEvent = {
  external_id: string;
  title: string;
  start_at: string | null;
  timezone: string | null;
  venue: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  ticket_url: string | null;
  published: boolean;
  secret: boolean;
  feed_updated_at: string | null;
  content_hash: string;
  address_signature: string;
};

function asString(v: unknown) {
  return typeof v === "string" ? v : null;
}

function asBool(v: unknown) {
  return typeof v === "boolean" ? v : null;
}

function isHttpUrl(url: string | null) {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

export function computeHash(obj: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function normalizeArtistflowItem(item: ArtistflowFeedItem): Omit<NormalizedExternalEvent, "external_id" | "content_hash" | "address_signature"> & {
  raw_external_id: string | null;
  fallback_id_basis: string;
  content_basis: Record<string, unknown>;
  address_signature_basis: string;
} {
  const dateSort = asString(item.dateSort) ?? asString(item.start_at);
  const title = (asString(item.title) ?? "").trim();
  const city = (asString(item.city) ?? "").trim();
  const venue = (asString(item.venue) ?? "").trim() || null;
  const address = (asString(item.address) ?? "").trim() || null;
  const postal_code = (asString(item.postal_code) ?? "").trim() || null;
  const country = ((asString(item.country) ?? "DE").trim().toUpperCase() || "DE").slice(0, 2);
  const timezone = (asString(item.timezone) ?? null)?.trim() || null;
  const updated_at = asString(item.updated_at);

  const ticketHref = (asString(item.ticketHref) ?? "").trim();
  const ticketText = (asString(item.ticketText) ?? "").trim();
  const ticketUrl = (asString(item.ticketUrl) ?? asString(item.ticket_url) ?? "").trim();
  let ticket_url: string | null = null;
  if (isHttpUrl(ticketHref)) ticket_url = ticketHref;
  else if (isHttpUrl(ticketUrl)) ticket_url = ticketUrl;
  else if (ticketText) ticket_url = ticketText;
  else if (ticketHref) ticket_url = ticketHref;
  else if (ticketUrl) ticket_url = ticketUrl;

  const published = asBool(item.published) ?? true;
  const secret = asBool(item.secret) ?? false;

  const raw_external_id = asString(item.event_id)?.trim() || null;

  // Keep start_at tolerant; if dateSort is date-only ISO, treat as midnight UTC.
  const start_at =
    dateSort && /^\d{4}-\d{2}-\d{2}$/.test(dateSort)
      ? `${dateSort}T00:00:00.000Z`
      : dateSort ?? null;

  const fallback_id_basis = `${dateSort ?? ""}|${title}|${city}|${venue ?? ""}`;

  const content_basis = {
    title,
    start_at,
    timezone,
    venue,
    address,
    postal_code,
    city,
    country,
    ticket_url,
    published,
    secret,
  };

  const address_signature_basis = `${address ?? ""}|${postal_code ?? ""}|${city}|${country}`.toLowerCase().trim();

  return {
    raw_external_id,
    fallback_id_basis,
    content_basis,
    address_signature_basis,
    title,
    start_at,
    timezone,
    venue,
    address,
    postal_code,
    city,
    country,
    ticket_url,
    published,
    secret,
    feed_updated_at: updated_at ?? null,
  };
}

export function deriveExternalId(input: { raw_external_id: string | null; fallback_id_basis: string }) {
  return input.raw_external_id ?? computeHash(input.fallback_id_basis);
}

export function normalizeArtistflowEvent(item: ArtistflowFeedItem): NormalizedExternalEvent {
  const base = normalizeArtistflowItem(item);
  const external_id = deriveExternalId(base);
  const content_hash = computeHash(base.content_basis);
  const address_signature = computeHash(base.address_signature_basis);
  return {
    external_id,
    title: base.title,
    start_at: base.start_at,
    timezone: base.timezone,
    venue: base.venue,
    address: base.address,
    postal_code: base.postal_code,
    city: base.city,
    country: base.country,
    ticket_url: base.ticket_url,
    published: base.published,
    secret: base.secret,
    feed_updated_at: base.feed_updated_at,
    content_hash,
    address_signature,
  };
}

