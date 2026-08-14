/**
 * Backfill: last_app_active_at und/oder Auth last_sign_in_at
 * → profiles.app_registration_status = registered
 * (nur wenn Status noch open; deleted bleibt unberührt)
 *
 *   node --env-file=.env.local scripts/backfill-app-registration.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY erforderlich.");
  process.exit(1);
}

const admin = createClient(url, serviceKey);

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return users;
}

async function loadAllProfiles() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await admin
      .from("profiles")
      .select("id,app_registration_status,app_registered_at,last_app_active_at")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const authUsers = await listAllAuthUsers();
const signInById = new Map(authUsers.map((u) => [u.id, u.last_sign_in_at ?? null]));
console.log(`Auth users: ${authUsers.length}, with last_sign_in: ${authUsers.filter((u) => u.last_sign_in_at).length}`);

const profiles = await loadAllProfiles();
console.log(`Profiles: ${profiles.length}`);

let updated = 0;
let skipped = 0;
let errors = 0;

for (const profile of profiles) {
  if (profile.app_registration_status === "deleted") {
    skipped += 1;
    continue;
  }
  if (profile.app_registration_status === "registered" && profile.app_registered_at) {
    skipped += 1;
    continue;
  }

  const lastSignIn = signInById.get(profile.id) ?? null;
  const lastActive = profile.last_app_active_at ?? null;
  if (!lastSignIn && !lastActive) {
    skipped += 1;
    continue;
  }

  const registeredAt = profile.app_registered_at ?? lastActive ?? lastSignIn;
  const { error: updErr } = await admin
    .from("profiles")
    .update({
      app_registration_status: "registered",
      app_registered_at: registeredAt,
    })
    .eq("id", profile.id);
  if (updErr) {
    console.warn(`[err] ${profile.id}: ${updErr.message}`);
    errors += 1;
    continue;
  }
  updated += 1;
}

const { count: registeredCount } = await admin
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("app_registration_status", "registered");

console.log(`✓ backfill done: updated=${updated} skipped=${skipped} errors=${errors}`);
console.log(`✓ profiles with status=registered: ${registeredCount ?? "?"}`);
