/**
 * Backfill: Auth last_sign_in_at → profiles.app_registration_status = registered
 * (nur wenn Status noch open / leer; deleted bleibt unberührt)
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

const authUsers = await listAllAuthUsers();
const withSignIn = authUsers.filter((u) => u.last_sign_in_at);
console.log(`Auth users: ${authUsers.length}, with last_sign_in: ${withSignIn.length}`);

let updated = 0;
let skipped = 0;
let errors = 0;

for (const u of withSignIn) {
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id,app_registration_status,app_registered_at")
    .eq("id", u.id)
    .maybeSingle();
  if (pErr) {
    console.warn(`[skip] ${u.id}: ${pErr.message}`);
    errors += 1;
    continue;
  }
  if (!profile) {
    skipped += 1;
    continue;
  }
  if (profile.app_registration_status === "deleted") {
    skipped += 1;
    continue;
  }
  if (profile.app_registration_status === "registered" && profile.app_registered_at) {
    skipped += 1;
    continue;
  }

  const { error: updErr } = await admin
    .from("profiles")
    .update({
      app_registration_status: "registered",
      app_registered_at: profile.app_registered_at ?? u.last_sign_in_at,
    })
    .eq("id", u.id);
  if (updErr) {
    console.warn(`[err] ${u.id}: ${updErr.message}`);
    errors += 1;
    continue;
  }
  updated += 1;
}

console.log(`✓ backfill done: updated=${updated} skipped=${skipped} errors=${errors}`);
