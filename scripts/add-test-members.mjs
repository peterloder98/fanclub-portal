/**
 * Legt 10 weitere Test-Mitglieder an (ohne bestehende zu löschen),
 * vergibt fortlaufende Mitgliedsnummern, Punkte, Feed/Umfragen/Gewinnspiele,
 * geocodiert alle aktiven Mitglieder mit vollständiger Adresse.
 *
 * node --env-file=.env.local scripts/add-test-members.mjs
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { geocodeProfileAddress, sleep } from "./lib/geocode-profile.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const PASSWORD = "Test!23456";

const NEW_MEMBERS = [
  { first: "Lukas", last: "Braun", gender: "m", addr: { street: "Am Wall 207", postal_code: "28195", city: "Bremen" } },
  { first: "Sophie", last: "Klein", gender: "w", addr: { street: "Königsallee 60", postal_code: "40212", city: "Düsseldorf" } },
  { first: "Markus", last: "Neumann", gender: "m", addr: { street: "Westenhellweg 1", postal_code: "44137", city: "Dortmund" } },
  { first: "Laura", last: "Schwarz", gender: "w", addr: { street: "Kettwiger Str. 36", postal_code: "45127", city: "Essen" } },
  { first: "Thomas", last: "Zimmermann", gender: "m", addr: { street: "Markt 16", postal_code: "53111", city: "Bonn" } },
  { first: "Julia", last: "Hartmann", gender: "w", addr: { street: "Planken 1", postal_code: "68161", city: "Mannheim" } },
  { first: "Stefan", last: "Kaiser", gender: "m", addr: { street: "Kaiser-Joseph-Str. 237", postal_code: "79098", city: "Freiburg" } },
  { first: "Maria", last: "Lang", gender: "w", addr: { street: "Maximilianstraße 40", postal_code: "86150", city: "Augsburg" } },
  { first: "Michael", last: "Pohl", gender: "m", addr: { street: "Holstenstraße 96", postal_code: "24103", city: "Kiel" } },
  { first: "Katharina", last: "Arnold", gender: "w", addr: { street: "Schusterstraße 11", postal_code: "55116", city: "Mainz" } },
];

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

async function findUserIdByEmail(email) {
  const users = await listAllAuthUsers();
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function nextMembershipNumber() {
  const { data } = await admin.from("profiles").select("membership_number");
  let max = 0;
  for (const row of data ?? []) {
    const n = parseInt(String(row.membership_number ?? "").replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

async function fetchPortraitBuffer(gender, seed) {
  const apiUrl = `https://randomuser.me/api/?inc=picture&noinfo&gender=${gender}&seed=fanclub${seed}`;
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`randomuser ${res.status}`);
  const json = await res.json();
  const pic = json.results?.[0]?.picture?.large;
  if (!pic) throw new Error("No portrait URL");
  const imgRes = await fetch(pic);
  if (!imgRes.ok) throw new Error(`Portrait download ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

async function uploadAvatar(userId, gender, seed) {
  const raw = await fetchPortraitBuffer(gender, seed);
  const webp = await sharp(raw)
    .resize(96, 96, { fit: "cover", position: "attention" })
    .webp({ quality: 72, effort: 4 })
    .toBuffer();
  const objectPath = `${userId}/avatar.webp`;
  const { error: upErr } = await admin.storage.from("avatars").upload(objectPath, webp, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "3600",
  });
  if (upErr) throw upErr;
  const now = new Date().toISOString();
  await admin
    .from("profiles")
    .update({ avatar_path: objectPath, updated_at: now })
    .eq("id", userId);
}

async function createNewMembers(startNum) {
  const createdIds = [];
  const start = "2025-06-01";
  const end = "2026-06-01";

  for (let i = 0; i < NEW_MEMBERS.length; i++) {
    const m = NEW_MEMBERS[i];
    const num = startNum + i;
    const numStr = String(num);
    const email = `mail+mitglied${String(num).padStart(2, "0")}@peter-loder.de`;

    console.log(`==> ${m.first} ${m.last} (#${numStr})`);
    let userId = await findUserIdByEmail(email);

    if (!userId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: "member",
          username: `test.mitglied${numStr}`,
          first_name: m.first,
          last_name: m.last,
        },
      });
      if (createError) throw createError;
      userId = created.user.id;
    } else {
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
    }

    const profile = {
      id: userId,
      email,
      role: "member",
      username: `test.mitglied${numStr}`,
      membership_number: numStr,
      first_name: m.first,
      last_name: m.last,
      birthdate: `${1988 + (i % 8)}-${String((i % 12) + 1).padStart(2, "0")}-20`,
      gender: m.gender,
      street: m.addr.street,
      postal_code: m.addr.postal_code,
      city: m.addr.city,
      country: "DE",
      phone: `+49 171 ${String(2000000 + num).slice(-7)}`,
    };

    const { error: profileError } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
    if (profileError) throw profileError;

    const { error: membershipError } = await admin.from("memberships").upsert(
      { user_id: userId, start_date: start, end_date: end, fee_cents: 1500, status: "active" },
      { onConflict: "user_id,start_date" },
    );
    if (membershipError) {
      const { error: insErr } = await admin.from("memberships").insert({
        user_id: userId,
        start_date: start,
        end_date: end,
        fee_cents: 1500,
        status: "active",
      });
      if (insErr) throw insErr;
    }

    try {
      await uploadAvatar(userId, m.gender === "w" ? "female" : "male", num + 100);
    } catch (e) {
      console.warn(`  Avatar: ${e.message}`);
    }

    createdIds.push(userId);
    console.log(`  OK ${userId}`);
  }

  return createdIds;
}

async function seedEngagement(userIds) {
  if (!userIds.length) return;

  const { data: polls } = await admin
    .from("polls")
    .select("id,allow_multiple,ends_at")
    .eq("is_active", true)
    .gt("ends_at", new Date().toISOString());

  for (const poll of polls ?? []) {
    const { data: opts } = await admin
      .from("poll_options")
      .select("id,sort_order")
      .eq("poll_id", poll.id)
      .order("sort_order");
    if (!opts?.length) continue;

    let ui = 0;
    for (const userId of userIds) {
      const opt = opts[ui % opts.length];
      ui++;
      await admin.from("poll_votes").upsert(
        { poll_id: poll.id, user_id: userId, option_id: opt.id },
        { onConflict: "poll_id,user_id,option_id", ignoreDuplicates: true },
      );
    }
    console.log(`Umfrage ${poll.id.slice(0, 8)}… — ${userIds.length} Stimmen`);
  }

  const { data: posts } = await admin
    .from("posts")
    .select("id,is_birthday")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);

  const comments = [
    "Herzlichen Glückwunsch!",
    "Tolle Idee!",
    "Bin dabei.",
    "Danke fürs Teilen.",
    "Super!",
  ];

  for (let pi = 0; pi < (posts ?? []).length; pi++) {
    const post = posts[pi];
    for (let ui = 0; ui < userIds.length; ui++) {
      const userId = userIds[ui];
      if (ui % 2 === 0) {
        await admin.from("post_likes").upsert(
          { post_id: post.id, user_id: userId },
          { onConflict: "post_id,user_id", ignoreDuplicates: true },
        );
      }
      if (ui % 3 === pi % 3) {
        await admin.from("post_comments").insert({
          post_id: post.id,
          author_id: userId,
          body: comments[(pi + ui) % comments.length],
        });
      }
    }
  }
  console.log(`Feed: Likes/Kommentare auf ${(posts ?? []).length} Beiträge`);
}

async function seedPoints(userIds) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { data: polls } = await admin.from("polls").select("id").limit(3);
  const { data: posts } = await admin
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .limit(5);
  const { data: giveaways } = await admin.from("giveaways").select("id").eq("status", "active").limit(2);

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const base = 12 + i * 7;
    const rows = [];
    if (polls?.[0]?.id) {
      rows.push({ user_id: userId, points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls[0].id });
    }
    if (polls?.[1]?.id) {
      rows.push({ user_id: userId, points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls[1].id });
    }
    if (posts?.[0]?.id) {
      rows.push({ user_id: userId, points: 3, reason: "post_comment", entity_type: "post", entity_id: posts[0].id });
    }
    if (posts?.[1]?.id) {
      rows.push({ user_id: userId, points: 1, reason: "post_like", entity_type: "post", entity_id: posts[1].id });
    }
    if (giveaways?.[0]?.id) {
      rows.push({
        user_id: userId,
        points: 2,
        reason: "giveaway_entry",
        entity_type: "giveaway",
        entity_id: giveaways[0].id,
      });
    }
    if (posts?.[2]?.id) {
      rows.push({
        user_id: userId,
        points: Math.min(10, base),
        reason: "post_like",
        entity_type: "post",
        entity_id: posts[2].id,
      });
    }

    for (const row of rows) {
      const { error } = await admin.from("points_transactions").insert({
        ...row,
        created_at: yearStart,
      });
      if (error && !/duplicate|unique/i.test(error.message)) {
        console.warn(`  Punkte ${userId}: ${error.message}`);
      }
    }
  }
  console.log(`Punkte für ${userIds.length} Mitglieder`);
}

async function geocodeAllActiveMembers() {
  const { data: memberships } = await admin.from("memberships").select("user_id").eq("status", "active");
  const ids = [...new Set((memberships ?? []).map((m) => m.user_id))];
  if (!ids.length) return;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,street,postal_code,city,country")
    .in("id", ids);

  let ok = 0;
  for (const p of profiles ?? []) {
    const coords = await geocodeProfileAddress(p);
    await sleep(1100);
    if (!coords) {
      console.log(`— Geocode fehlgeschlagen: ${p.first_name} ${p.last_name}`);
      continue;
    }
    await admin
      .from("profiles")
      .update({ map_lat: coords.lat, map_lng: coords.lng })
      .eq("id", p.id);
    ok += 1;
    console.log(`Karte OK: ${p.first_name} ${p.last_name}`);
  }
  console.log(`Geocodiert: ${ok}/${profiles?.length ?? 0} aktive Mitglieder`);
}

async function main() {
  const startNum = await nextMembershipNumber();
  console.log(`Nächste Mitgliedsnummer: ${startNum}\n`);

  const newIds = await createNewMembers(startNum);
  console.log("\n=== Engagement ===\n");
  await seedEngagement(newIds);

  console.log("\n=== Punkte ===\n");
  await seedPoints(newIds);

  console.log("\n=== Geocoding (alle aktiven Mitglieder) ===\n");
  await geocodeAllActiveMembers();

  console.log("\nFertig.");
  console.log("Passwort:", PASSWORD);
  console.log(
    `Neue E-Mails: mail+mitglied${String(startNum).padStart(2, "0")}@peter-loder.de … mail+mitglied${String(startNum + NEW_MEMBERS.length - 1).padStart(2, "0")}@peter-loder.de`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
