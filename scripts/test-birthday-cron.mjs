/**
 * Geburtstags-Cron testen (HTTP + direkte DB-Prüfung).
 * node --env-file=.env.local scripts/test-birthday-cron.mjs
 * node --env-file=.env.local scripts/test-birthday-cron.mjs --ensure-birthday
 * Optional: BASE_URL=http://localhost:3000
 */

import { createClient } from "@supabase/supabase-js";

function berlinTodayMd() {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${m}-${d}`;
}

function berlinTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET?.trim();
const baseUrl =
  process.env.BASE_URL?.trim() ||
  process.env.APP_BASE_URL?.trim() ||
  "http://localhost:3000";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ensureBirthday = process.argv.includes("--ensure-birthday");

const admin = createClient(url, key, { auth: { persistSession: false } });
const todayMd = berlinTodayMd();
const todayIso = berlinTodayIsoDate();
console.log("Berlin heute:", todayIso, `(MM-DD: ${todayMd})`);

const { data: profiles } = await admin
  .from("profiles")
  .select("id,first_name,birthdate")
  .not("birthdate", "is", null);

const { data: active } = await admin.from("memberships").select("user_id").eq("status", "active");
const activeIds = new Set((active ?? []).map((m) => m.user_id));

const birthdayToday = (profiles ?? []).filter((p) => {
  if (!activeIds.has(p.id) || !p.birthdate) return false;
  return String(p.birthdate).slice(5, 10) === todayMd;
});

let restoredBirthdate = null;
let patchedUserId = null;

if (birthdayToday.length === 0 && ensureBirthday) {
  const candidate = (profiles ?? []).find((p) => activeIds.has(p.id));
  if (candidate) {
    restoredBirthdate = candidate.birthdate;
    patchedUserId = candidate.id;
    const patchBd = `1990-${todayMd}`;
    const { error: patchErr } = await admin
      .from("profiles")
      .update({ birthdate: patchBd })
      .eq("id", candidate.id);
    if (patchErr) {
      console.error("Konnte Test-Geburtsdatum nicht setzen:", patchErr.message);
      process.exit(1);
    }
    console.log(
      `Test: ${candidate.first_name} (${candidate.id.slice(0, 8)}) birthdate → ${patchBd} (vorher: ${restoredBirthdate})`,
    );
    birthdayToday.push({ ...candidate, birthdate: patchBd });
  }
}

console.log("Aktive Mitglieder mit Geburtstag heute:", birthdayToday.length);
for (const p of birthdayToday) {
  console.log(" -", p.first_name, p.id.slice(0, 8), p.birthdate);
}

const { data: postsBefore } = await admin
  .from("posts")
  .select("id,title,birthday_user_id")
  .eq("is_birthday", true)
  .eq("birthday_date", todayIso);

console.log("Geburtstags-Posts heute (vorher):", postsBefore?.length ?? 0);

if (!cronSecret) {
  console.warn("CRON_SECRET fehlt — HTTP-Test übersprungen.");
  process.exit(birthdayToday.length === 0 ? 0 : 1);
}

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/cron/birthday-posts`;
console.log("HTTP GET", endpoint);

const res = await fetch(endpoint, {
  headers: { Authorization: `Bearer ${cronSecret}` },
});
const body = await res.text();
let json;
try {
  json = JSON.parse(body);
} catch {
  json = { raw: body.slice(0, 500) };
}

console.log("HTTP Status:", res.status);
console.log("Response:", JSON.stringify(json, null, 2));

if (!res.ok) {
  process.exit(1);
}

const { data: postsAfter } = await admin
  .from("posts")
  .select("id,title,body,birthday_user_id,created_at")
  .eq("is_birthday", true)
  .eq("birthday_date", todayIso)
  .order("created_at", { ascending: false });

console.log("Geburtstags-Posts heute (nachher):", postsAfter?.length ?? 0);
for (const p of postsAfter ?? []) {
  console.log(" -", p.title, "| user:", p.birthday_user_id?.slice(0, 8));
}

const created = json.created ?? 0;
if (birthdayToday.length > 0 && (postsAfter?.length ?? 0) === 0 && created === 0) {
  console.error("Erwartet Posts, aber nichts erstellt — prüfe Migration 043 (birthday_user_id).");
  process.exit(1);
}

if (patchedUserId && restoredBirthdate !== undefined) {
  await admin.from("profiles").update({ birthdate: restoredBirthdate }).eq("id", patchedUserId);
  console.log("Test-Geburtsdatum wiederhergestellt.");
}

console.log("OK — Cron-Test abgeschlossen.");
