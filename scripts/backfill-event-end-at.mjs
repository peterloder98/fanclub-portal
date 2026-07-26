/**
 * Füllt end_at / date_label aus Artistflow-Feed (auch wenn content_hash unverändert).
 * node --env-file=.env.local scripts/backfill-event-end-at.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const feedUrl = process.env.ARTISTFLOW_FEED_URL;
if (!url || !key || !feedUrl) {
  console.error("Missing env");
  process.exit(1);
}

function parseArtistflowDateLabel(dateLabel) {
  const raw = (dateLabel ?? "").trim();
  if (!raw) return { startDate: null, endDate: null };
  const range = raw.match(
    /^(\d{2})\.(\d{2})\.(?:(\d{4}))?\s*[-–—]\s*(\d{2})\.(\d{2})\.(\d{4})$/,
  );
  if (range) {
    const d1 = Number(range[1]);
    const m1 = Number(range[2]);
    const y2 = Number(range[6]);
    const d2 = Number(range[4]);
    const m2 = Number(range[5]);
    let y1 = range[3] ? Number(range[3]) : y2;
    if (!range[3] && m1 > m2) y1 = y2 - 1;
    const pad = (n) => String(n).padStart(2, "0");
    return {
      startDate: `${y1}-${pad(m1)}-${pad(d1)}`,
      endDate: `${y2}-${pad(m2)}-${pad(d2)}`,
    };
  }
  return { startDate: null, endDate: null };
}

function dateOnlyToStartAt(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return `${isoDate}T00:00:00.000Z`;
}

const admin = createClient(url, key);
const feed = await (await fetch(feedUrl, { cache: "no-store" })).json();
if (!Array.isArray(feed)) throw new Error("Feed is not an array");

const { data: events, error } = await admin
  .from("external_events")
  .select("id,external_id,title,start_at,end_at,date_label")
  .eq("source", "artistflow");
if (error) throw error;

const byExternal = new Map((events ?? []).map((e) => [e.external_id, e]));
let updated = 0;
let skipped = 0;

for (const item of feed) {
  const externalId = (item.event_id ?? "").trim();
  if (!externalId) continue;
  const row = byExternal.get(externalId);
  if (!row) {
    skipped += 1;
    continue;
  }
  const dateLabel = (item.dateLabel ?? "").trim() || null;
  const { endDate } = parseArtistflowDateLabel(dateLabel);
  const endAt = dateOnlyToStartAt(endDate);
  if (row.end_at === endAt && row.date_label === dateLabel) {
    skipped += 1;
    continue;
  }
  const { error: upErr } = await admin
    .from("external_events")
    .update({ end_at: endAt, date_label: dateLabel })
    .eq("id", row.id);
  if (upErr) throw upErr;
  updated += 1;
  console.log(`OK ${item.title}: ${dateLabel ?? "—"} → end ${endAt ?? "null"}`);
}

console.log(`\nFertig: ${updated} aktualisiert, ${skipped} übersprungen.`);
