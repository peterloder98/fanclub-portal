/**
 * Importiert 5 aktive Mitglieder (Nr. 83–87) inkl. Auth, Profil, Membership, Beitrag.
 * Setzt membership_number_counters.last_seq auf mindestens 87.
 *
 *   node --env-file=.env.local scripts/import-members-83-87.mjs
 *   node --env-file=.env.local scripts/import-members-83-87.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { geocodeProfileAddress, sleep } from "./lib/geocode-profile.mjs";

const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

/** @type {Array<{
 *   membership_number: string;
 *   first_name: string;
 *   last_name: string;
 *   street: string;
 *   postal_code: string;
 *   city: string;
 *   country: string;
 *   start_date: string;
 *   payment_date: string;
 *   phone: string;
 *   birthdate: string;
 *   gender: "m" | "w" | "d";
 *   email: string;
 * }>} */
const MEMBERS = [
  {
    membership_number: "83",
    last_name: "Wienke",
    first_name: "Renate",
    street: "Rebhuhnstr. 13",
    postal_code: "21683",
    city: "Stade",
    country: "DE",
    start_date: "2026-08-10",
    payment_date: "2026-08-12",
    phone: "0173 8040884",
    birthdate: "1959-04-24",
    gender: "w",
    email: "wkmauri@icloud.com",
  },
  {
    membership_number: "84",
    last_name: "Kuppi",
    first_name: "Maik",
    street: "Am Fichtbusch 42",
    postal_code: "08340",
    city: "Schwarzenberg",
    country: "DE",
    start_date: "2026-08-10",
    payment_date: "2026-08-12",
    phone: "0152 37267160",
    birthdate: "1976-05-02",
    gender: "m",
    email: "maikkuppi@gmx.de",
  },
  {
    membership_number: "85",
    last_name: "Voß",
    first_name: "Dietlinde",
    street: "Sommerberger Kirchweg 3a",
    postal_code: "44267",
    city: "Dortmund",
    country: "DE",
    start_date: "2026-08-10",
    payment_date: "2026-08-12",
    phone: "0178 2971665",
    birthdate: "1955-04-12",
    gender: "w",
    email: "md.voss@t-online.de",
  },
  {
    membership_number: "86",
    last_name: "Braum",
    first_name: "Dolores",
    street: "Im Böning 13",
    postal_code: "63695",
    city: "Glauburg",
    country: "DE",
    start_date: "2026-08-10",
    payment_date: "2026-08-13",
    phone: "0151 54870370",
    birthdate: "1972-03-29",
    gender: "w",
    email: "dollymartinbraum@gmx.de",
  },
  {
    membership_number: "87",
    last_name: "Haßdenteufel",
    first_name: "Jasmin",
    street: "Ulmenweg 15",
    postal_code: "21683",
    city: "Stade",
    country: "DE",
    start_date: "2026-08-13",
    payment_date: "2026-08-13",
    phone: "0176 46574857",
    birthdate: "1979-06-21",
    gender: "w",
    email: "jasminhassdenteufel79@gmail.com",
  },
];

function addYear(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function baseUsername(first, last) {
  const slug = `${first}.${last}`
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");
  return slug || "member";
}

async function listAllAuthUsers() {
  const all = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }
  return all;
}

async function uniqueUsername(first, last, excludeUserId = null) {
  const base = baseUsername(first, last);
  for (let i = 0; i < 80; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data || (excludeUserId && data.id === excludeUserId)) return candidate;
  }
  return `${base}.${Date.now()}`;
}

async function ensureMembership(userId, m) {
  const end = addYear(m.start_date);
  const { data: existing } = await admin
    .from("memberships")
    .select("id,start_date,end_date,status")
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("memberships")
      .update({
        start_date: m.start_date,
        end_date: end,
        fee_cents: 1500,
        status: "active",
      })
      .eq("id", existing.id);
    if (error) throw new Error(`membership update: ${error.message}`);
    return "updated";
  }

  const { error } = await admin.from("memberships").insert({
    user_id: userId,
    start_date: m.start_date,
    end_date: end,
    fee_cents: 1500,
    status: "active",
  });
  if (error) throw new Error(`membership insert: ${error.message}`);
  return "created";
}

async function ensurePayment(userId, m) {
  const { data: existingRows } = await admin
    .from("club_ledger_entries")
    .select("id,entry_date,amount_cents,description")
    .eq("member_id", userId)
    .eq("entry_type", "income")
    .eq("category", "membership")
    .order("entry_date", { ascending: false })
    .limit(5);

  const existing =
    (existingRows ?? []).find((e) => /mitgliedsbeitrag\s*2026/i.test(e.description ?? "")) ??
    (existingRows ?? [])[0] ??
    null;

  if (existing) {
    const needsUpdate =
      existing.entry_date !== m.payment_date || existing.amount_cents !== 1500;
    if (needsUpdate) {
      const { error } = await admin
        .from("club_ledger_entries")
        .update({
          entry_date: m.payment_date,
          amount_cents: 1500,
          bookkeeping_status: "paid",
          description: "Mitgliedsbeitrag 2026",
        })
        .eq("id", existing.id);
      if (error) throw new Error(`ledger update: ${error.message}`);
      return "updated";
    }
    return "unchanged";
  }

  const { error } = await admin.from("club_ledger_entries").insert({
    entry_type: "income",
    amount_cents: 1500,
    description: "Mitgliedsbeitrag 2026",
    category: "membership",
    member_id: userId,
    entry_date: m.payment_date,
    bookkeeping_status: "paid",
  });
  if (error) throw new Error(`ledger insert: ${error.message}`);
  return "created";
}

async function upsertProfile(userId, m, username) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "member",
      username,
      membership_number: m.membership_number,
      email: m.email,
      first_name: m.first_name,
      last_name: m.last_name,
      birthdate: m.birthdate,
      gender: m.gender,
      street: m.street,
      postal_code: m.postal_code,
      city: m.city,
      country: m.country,
      phone: m.phone,
      contribution_date: m.payment_date,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`profile: ${error.message}`);
}

async function geocodeQuiet(userId, m) {
  try {
    const coords = await geocodeProfileAddress({
      street: m.street,
      postal_code: m.postal_code,
      city: m.city,
      country: m.country,
    });
    await sleep(1100);
    if (!coords) {
      console.warn(`  Keine Geo-Koordinaten für #${m.membership_number}`);
      return;
    }
    await admin
      .from("profiles")
      .update({ map_lat: coords.lat, map_lng: coords.lng })
      .eq("id", userId);
  } catch (e) {
    console.warn(`  Geocode #${m.membership_number}: ${e.message}`);
  }
}

async function importOne(m, authByEmail) {
  const email = m.email.toLowerCase();
  console.log(`\n#${m.membership_number} ${m.last_name}, ${m.first_name} <${m.email}>`);

  const { data: byNr } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,membership_number")
    .eq("membership_number", m.membership_number)
    .maybeSingle();

  const { data: byEmail } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,membership_number")
    .ilike("email", email)
    .maybeSingle();

  const authUser = authByEmail.get(email) ?? null;

  if (byNr && byEmail && byNr.id !== byEmail.id) {
    console.warn(
      `  KONFLIKT: Nr.${m.membership_number} → ${byNr.id}, E-Mail → ${byEmail.id} — übersprungen`,
    );
    return { action: "conflict", membership_number: m.membership_number, email: m.email };
  }

  if (byNr && byNr.email && byNr.email.toLowerCase() !== email) {
    console.warn(
      `  KONFLIKT: Nr.${m.membership_number} schon bei ${byNr.first_name} ${byNr.last_name} <${byNr.email}> — übersprungen`,
    );
    return { action: "conflict", membership_number: m.membership_number, email: m.email };
  }

  if (byEmail && byEmail.membership_number && byEmail.membership_number !== m.membership_number) {
    console.warn(
      `  KONFLIKT: E-Mail schon bei Nr.${byEmail.membership_number} ${byEmail.first_name} ${byEmail.last_name} — übersprungen`,
    );
    return { action: "conflict", membership_number: m.membership_number, email: m.email };
  }

  let userId = byNr?.id ?? byEmail?.id ?? authUser?.id ?? null;
  let action = userId ? "updated" : "created";

  if (dryRun) {
    console.log(`  [dry] würde ${action}: Auth+Profil+Membership+Beitrag`);
    return { action: `dry-${action}`, membership_number: m.membership_number, email: m.email };
  }

  if (!userId) {
    const username = await uniqueUsername(m.first_name, m.last_name);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: m.email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        role: "member",
        username,
        first_name: m.first_name,
        last_name: m.last_name,
        imported: true,
      },
    });
    if (createErr) throw new Error(`auth create #${m.membership_number}: ${createErr.message}`);
    userId = created.user.id;
    await upsertProfile(userId, m, username);
    await ensureMembership(userId, m);
    await ensurePayment(userId, m);
    await geocodeQuiet(userId, m);
    console.log(`  erstellt ${userId}`);
    return { action: "created", membership_number: m.membership_number, email: m.email, userId };
  }

  // Existing: confirm email, sync profile/membership/payment
  const { error: authUpdErr } = await admin.auth.admin.updateUserById(userId, {
    email: m.email,
    email_confirm: true,
  });
  if (authUpdErr) throw new Error(`auth update #${m.membership_number}: ${authUpdErr.message}`);

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  const username =
    existingProfile?.username || (await uniqueUsername(m.first_name, m.last_name, userId));

  await upsertProfile(userId, m, username);
  await ensureMembership(userId, m);
  await ensurePayment(userId, m);
  await geocodeQuiet(userId, m);
  console.log(`  aktualisiert ${userId}`);
  return { action: "updated", membership_number: m.membership_number, email: m.email, userId };
}

async function bumpCounter() {
  const { data: before } = await admin
    .from("membership_number_counters")
    .select("last_seq")
    .eq("id", 1)
    .maybeSingle();

  const current = before?.last_seq ?? 0;
  const next = Math.max(current, 87);
  console.log(`\nZähler vorher: last_seq=${current}`);

  if (dryRun) {
    console.log(`[dry] würde last_seq → ${next} (nächste Vergabe ≥ 88)`);
    return next;
  }

  const { error } = await admin.from("membership_number_counters").upsert(
    { id: 1, last_seq: next },
    { onConflict: "id" },
  );
  if (error) {
    // RLS may block; try raw via RPC path: update with service role should work
    throw new Error(`counter upsert: ${error.message}`);
  }

  const { data: after } = await admin
    .from("membership_number_counters")
    .select("last_seq")
    .eq("id", 1)
    .single();
  console.log(`Zähler nachher: last_seq=${after.last_seq}`);
  return after.last_seq;
}

async function verifyNextNumber() {
  // Dry-check without consuming: read counter + max existing
  const { data: counter } = await admin
    .from("membership_number_counters")
    .select("last_seq")
    .eq("id", 1)
    .maybeSingle();
  const { data: profiles } = await admin.from("profiles").select("membership_number");
  let max = 0;
  for (const row of profiles ?? []) {
    const n = parseInt(String(row.membership_number ?? "").replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const predicted = Math.max(counter?.last_seq ?? 0, max) + 1;
  console.log(
    `Prüfung: max_membership=${max}, last_seq=${counter?.last_seq ?? "—"} → nächste Nummer wäre ${predicted}`,
  );
  return predicted;
}

async function main() {
  console.log(dryRun ? "=== DRY RUN Import 83–87 ===" : "=== LIVE Import 83–87 ===");
  console.log(`Supabase: ${url}`);

  const authUsers = await listAllAuthUsers();
  const authByEmail = new Map(
    authUsers.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]),
  );

  const results = [];
  for (const m of MEMBERS) {
    results.push(await importOne(m, authByEmail));
  }

  await bumpCounter();
  const next = await verifyNextNumber();

  console.log("\n=== Ergebnis ===");
  for (const r of results) {
    console.log(`  ${r.action.toUpperCase()} Nr.${r.membership_number} ${r.email}`);
  }
  console.log(`Nächste Mitgliedsnummer: ${next}`);
  if (next !== 88 && !dryRun) {
    console.warn(`WARNUNG: erwartet 88, berechnet ${next}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
