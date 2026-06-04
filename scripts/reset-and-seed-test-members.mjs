/**
 * Löscht Test-Mitglieder (außer Peter Loder + „Mitglied Fanclub“), legt 10 aktive
 * Testmitglieder an (Mitgliedsnr. 1–10) und füllt Umfragen, Gewinnspiele, Feed.
 *
 * Ausführen:
 *   node --env-file=.env.local scripts/reset-and-seed-test-members.mjs
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const PASSWORD = "Test!23456";

function shouldKeepProfile(p) {
  const fn = (p.first_name ?? "").trim();
  const ln = (p.last_name ?? "").trim();
  const email = (p.email ?? "").toLowerCase();
  if (email === "mail@peter-loder.de") return true;
  if (fn === "Peter" && ln === "Loder") return true;
  if (fn === "Mitglied" && ln === "Fanclub") return true;
  return false;
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

async function listAllProfiles() {
  const { data, error } = await admin.from("profiles").select("*");
  if (error) throw error;
  return data ?? [];
}

async function deleteTestMembers() {
  const profiles = await listAllProfiles();
  const authUsers = await listAllAuthUsers();
  const authById = new Map(authUsers.map((u) => [u.id, u]));

  let deleted = 0;
  for (const p of profiles) {
    if (shouldKeepProfile(p)) {
      console.log(`Behalte: ${p.first_name} ${p.last_name} (${p.email ?? authById.get(p.id)?.email ?? p.id})`);
      continue;
    }
    const email = p.email ?? authById.get(p.id)?.email ?? "?";
    console.log(`Lösche: ${p.first_name ?? ""} ${p.last_name ?? ""} <${email}>`);
    const { error } = await admin.auth.admin.deleteUser(p.id);
    if (error) {
      console.warn(`  Fehler: ${error.message}`);
    } else {
      deleted += 1;
    }
  }
  console.log(`Gelöscht: ${deleted} Benutzer\n`);
}

const FIRST_NAMES = [
  "Anna",
  "Ben",
  "Clara",
  "David",
  "Elena",
  "Felix",
  "Greta",
  "Hannes",
  "Ida",
  "Jakob",
];
const LAST_NAMES = [
  "Müller",
  "Schneider",
  "Fischer",
  "Weber",
  "Becker",
  "Hoffmann",
  "Koch",
  "Richter",
  "Wolf",
  "Schäfer",
];
/** Fake-Adressen (Straße, PLZ, Ort) für Karte / Mitglieder-Übersicht */
const MEMBER_ADDRESSES = [
  { street: "Sendlinger Str. 14", postal_code: "80331", city: "München" },
  { street: "Speersort 1", postal_code: "20095", city: "Hamburg" },
  { street: "Unter den Linden 77", postal_code: "10117", city: "Berlin" },
  { street: "Domkloster 4", postal_code: "50667", city: "Köln" },
  { street: "Zeil 85", postal_code: "60313", city: "Frankfurt am Main" },
  { street: "Königstraße 28", postal_code: "70173", city: "Stuttgart" },
  { street: "Nikolaistraße 33", postal_code: "04109", city: "Leipzig" },
  { street: "Prager Str. 4", postal_code: "01069", city: "Dresden" },
  { street: "Kröpcke 1", postal_code: "30159", city: "Hannover" },
  { street: "Königstraße 39", postal_code: "90402", city: "Nürnberg" },
];

function buildMembers() {
  const start = "2025-06-01";
  const end = "2026-06-01";
  return FIRST_NAMES.map((first, i) => {
    const last = LAST_NAMES[i];
    const n = i + 1;
    const num = String(n).padStart(2, "0");
    const addr = MEMBER_ADDRESSES[i];
    const gender = i % 2 === 0 ? "w" : "m";
    return {
      email: `mail+mitglied${num}@peter-loder.de`,
      membership_number: String(n),
      profile: {
        role: "member",
        username: `test.mitglied${num}`,
        membership_number: String(n),
        first_name: first,
        last_name: last,
        birthdate: `${1985 + (i % 12)}-${String((i % 12) + 1).padStart(2, "0")}-15`,
        gender,
        street: addr.street,
        postal_code: addr.postal_code,
        city: addr.city,
        country: "DE",
        phone: `+49 170 ${String(1000000 + n).slice(-7)}`,
      },
      membership: {
        start_date: start,
        end_date: end,
        fee_cents: 1500,
        status: "active",
      },
      portraitGender: gender === "w" ? "female" : "male",
      portraitSeed: n,
    };
  });
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
  const { error: profErr } = await admin
    .from("profiles")
    .update({ avatar_path: objectPath, updated_at: now })
    .eq("id", userId);
  if (profErr) throw profErr;
}

async function findUserIdByEmail(email) {
  const users = await listAllAuthUsers();
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function createMembers() {
  const members = buildMembers();
  const createdIds = [];

  for (const m of members) {
    console.log(`==> ${m.profile.first_name} ${m.profile.last_name} (#${m.membership_number})`);
    let userId = await findUserIdByEmail(m.email);

    if (!userId) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: m.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          role: m.profile.role,
          username: m.profile.username,
          first_name: m.profile.first_name,
          last_name: m.profile.last_name,
        },
      });
      if (createError) throw createError;
      userId = created.user.id;
    } else {
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
    }

    const { error: profileError } = await admin.from("profiles").upsert(
      { id: userId, email: m.email, ...m.profile },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    const { error: membershipError } = await admin.from("memberships").upsert(
      { user_id: userId, ...m.membership },
      { onConflict: "user_id,start_date" },
    );
    if (membershipError) {
      const { error: insErr } = await admin.from("memberships").insert({
        user_id: userId,
        ...m.membership,
      });
      if (insErr) throw insErr;
    }

    try {
      await uploadAvatar(userId, m.portraitGender, m.portraitSeed);
    } catch (e) {
      console.warn(`  Avatar: ${e.message}`);
    }

    createdIds.push(userId);
    console.log(`  OK ${userId}`);
  }

  const { geocodeProfileAddress, sleep } = await import("./lib/geocode-profile.mjs");
  for (const uid of createdIds) {
    const { data: prof } = await admin
      .from("profiles")
      .select("street,postal_code,city,country,first_name,last_name")
      .eq("id", uid)
      .maybeSingle();
    if (!prof) continue;
    const coords = await geocodeProfileAddress(prof);
    await sleep(1100);
    if (coords) {
      await admin.from("profiles").update({ map_lat: coords.lat, map_lng: coords.lng }).eq("id", uid);
    }
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
      if (poll.allow_multiple) {
        const second = opts[(ui + 1) % opts.length];
        await admin.from("poll_votes").upsert(
          [
            { poll_id: poll.id, user_id: userId, option_id: opt.id },
            { poll_id: poll.id, user_id: userId, option_id: second.id },
          ],
          { onConflict: "poll_id,user_id,option_id", ignoreDuplicates: true },
        );
      } else {
        await admin.from("poll_votes").upsert(
          { poll_id: poll.id, user_id: userId, option_id: opt.id },
          { onConflict: "poll_id,user_id,option_id", ignoreDuplicates: true },
        );
      }
    }
    console.log(`Umfrage: ${poll.id.slice(0, 8)}… — ${userIds.length} Stimmen`);
  }

  const { data: giveaways } = await admin
    .from("giveaways")
    .select("id,entry_mode,status,ends_at")
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString());

  const giveawayList =
    giveaways?.length > 0
      ? giveaways
      : ((await admin.from("giveaways").select("id,entry_mode,status").eq("status", "active")).data ??
        []);

  for (const g of giveawayList) {
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const { data: entry, error: entErr } = await admin
        .from("giveaway_entries")
        .upsert(
          { giveaway_id: g.id, user_id: userId, is_eligible: true },
          { onConflict: "giveaway_id,user_id", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();
      if (entErr && !/duplicate|unique/i.test(entErr.message)) {
        console.warn(`  Gewinnspiel ${g.id}: ${entErr.message}`);
        continue;
      }

      if (g.entry_mode === "quiz") {
        const { data: questions } = await admin
          .from("giveaway_questions")
          .select("id")
          .eq("giveaway_id", g.id)
          .order("sort_order");
        for (const q of questions ?? []) {
          const { data: options } = await admin
            .from("giveaway_question_options")
            .select("id")
            .eq("question_id", q.id)
            .order("sort_order")
            .limit(1);
          const optId = options?.[0]?.id;
          const entryId = entry?.id;
          if (optId && entryId) {
            await admin.from("giveaway_entry_answers").upsert(
              { entry_id: entryId, question_id: q.id, option_id: optId },
              { onConflict: "entry_id,question_id", ignoreDuplicates: true },
            );
          }
        }
      }
    }
    console.log(`Gewinnspiel: ${g.id.slice(0, 8)}… — Teilnahmen`);
  }

  const { data: posts } = await admin
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);

  const comments = [
    "Super Beitrag!",
    "Freue mich drauf!",
    "Danke fürs Teilen.",
    "Genau mein Ding.",
    "❤️",
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
        const { error: cErr } = await admin.from("post_comments").insert({
          post_id: post.id,
          author_id: userId,
          body: comments[(pi + ui) % comments.length],
        });
        if (cErr && !/duplicate|unique/i.test(cErr.message)) {
          console.warn(`  Kommentar: ${cErr.message}`);
        }
      }
    }
  }
  console.log(`Feed: Likes/Kommentare auf ${(posts ?? []).length} Beiträge`);
}

async function main() {
  console.log("=== Test-Mitglieder zurücksetzen ===\n");
  await deleteTestMembers();
  const userIds = await createMembers();
  console.log("\n=== Engagement (Umfragen, Gewinnspiele, Feed) ===\n");
  await seedEngagement(userIds);
  console.log("\nFertig.");
  console.log("Passwort aller neuen Test-Accounts:", PASSWORD);
  console.log("E-Mails: mail+mitglied01@peter-loder.de … mail+mitglied10@peter-loder.de");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
