import crypto from "node:crypto";

export type ArtistflowFeedItem = Record<string, unknown>;

export type EventKind = "event" | "tv";

export type NormalizedExternalEvent = {
  external_id: string;
  kind: EventKind;
  title: string;
  start_at: string | null;
  timezone: string | null;
  venue: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  broadcaster: string | null;
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

function parseKind(v: unknown): EventKind {
  const raw = (asString(v) ?? "event").trim().toLowerCase();
  return raw === "tv" ? "tv" : "event";
}

function parseCountryCode(item: ArtistflowFeedItem): string {
  const cc = (asString(item.countryCode) ?? asString(item.country) ?? "").trim().toUpperCase();
  return (cc || "DE").slice(0, 2);
}

function resolveLinkField(...candidates: Array<string | null>): string | null {
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (!v) continue;
    if (isHttpUrl(v)) return v;
  }
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (v) return v;
  }
  return null;
}

export function computeHash(obj: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export function canGeocodeNormalizedEvent(e: {
  kind: EventKind | string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
}): boolean {
  if (e.kind === "tv") return false;
  return Boolean((e.city ?? "").trim());
}

export function normalizeArtistflowItem(item: ArtistflowFeedItem): Omit<
  NormalizedExternalEvent,
  "external_id" | "content_hash" | "address_signature"
> & {
  raw_external_id: string | null;
  fallback_id_basis: string;
  content_basis: Record<string, unknown>;
  address_signature_basis: string;
} {
  const kind = parseKind(item.kind);
  const dateSort = asString(item.dateSort) ?? asString(item.start_at) ?? asString(item.date);
  const title = (asString(item.title) ?? "").trim();
  const city = (asString(item.city) ?? "").trim();
  const venue = (asString(item.venue) ?? "").trim() || null;
  const address = (asString(item.address) ?? "").trim() || null;
  const postal_code = (asString(item.postal_code) ?? "").trim() || null;
  const country = parseCountryCode(item);
  const timezone = (asString(item.timezone) ?? null)?.trim() || null;
  const updated_at = asString(item.updated_at);
  const broadcaster = (asString(item.broadcaster) ?? "").trim() || null;

  const ticketHref = (asString(item.ticketHref) ?? "").trim();
  const ticketText = (asString(item.ticketText) ?? "").trim();
  const ticketUrl = (asString(item.ticketUrl) ?? asString(item.ticket_url) ?? "").trim();
  const infoUrl = (asString(item.infoUrl) ?? "").trim();
  const infoText = (asString(item.infoText) ?? "").trim();

  const ticket_url =
    kind === "tv"
      ? resolveLinkField(infoUrl, ticketHref, ticketUrl, infoText, ticketText)
      : resolveLinkField(ticketHref, ticketUrl, ticketText);

  const published = asBool(item.published) ?? true;
  const secret = asBool(item.secret) ?? false;

  const raw_external_id = asString(item.event_id)?.trim() || null;

  // Keep start_at tolerant; if dateSort is date-only ISO, treat as midnight UTC.
  const start_at =
    dateSort && /^\d{4}-\d{2}-\d{2}$/.test(dateSort)
      ? `${dateSort}T00:00:00.000Z`
      : dateSort ?? null;

  const fallback_id_basis = `${kind}|${dateSort ?? ""}|${title}|${city}|${venue ?? ""}|${broadcaster ?? ""}`;

  const content_basis = {
    kind,
    title,
    start_at,
    timezone,
    venue,
    address,
    postal_code,
    city,
    country,
    broadcaster,
    ticket_url,
    published,
    secret,
  };

  const address_signature_basis = `${address ?? ""}|${postal_code ?? ""}|${city}|${country}`
    .toLowerCase()
    .trim();

  return {
    raw_external_id,
    fallback_id_basis,
    content_basis,
    address_signature_basis,
    kind,
    title,
    start_at,
    timezone,
    venue,
    address,
    postal_code,
    city,
    country,
    broadcaster,
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
    kind: base.kind,
    title: base.title,
    start_at: base.start_at,
    timezone: base.timezone,
    venue: base.venue,
    address: base.address,
    postal_code: base.postal_code,
    city: base.city,
    country: base.country,
    broadcaster: base.broadcaster,
    ticket_url: base.ticket_url,
    published: base.published,
    secret: base.secret,
    feed_updated_at: base.feed_updated_at,
    content_hash,
    address_signature,
  };
}
