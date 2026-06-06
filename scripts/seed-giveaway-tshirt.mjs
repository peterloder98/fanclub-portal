/**
 * 10 Teilnehmer am Gewinnspiel „Fanclub T-Shirt“, Kommentare & unterschiedliche Punkte.
 *
 * npx tsx --env-file=.env.local scripts/seed-giveaway-tshirt.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const GIVEAWAY_TITLES = ["Fanclub T-Shirt", "Test: Fanclub-T-Shirt", "Fanclub-T-Shirt"];

const COMMENTS = [
  "Ich will unbedingt das T-Shirt!",
  "Super Aktion — bin dabei!",
  "Hoffentlich hab ich Glück 🍀",
  "Tolles Gewinnspiel!",
  "Wann kommt die Auslosung?",
  "Freue mich schon aufs Shirt.",
  "Danke fürs Organisieren!",
  "Bin gespannt!",
  "Das Design ist mega.",
  "Klasse Idee vom Fanclub.",
  "Ich drücke allen die Daumen.",
  "Noch ein Kommentar — go Anni!",
];

async function findGiveaway() {
  for (const title of GIVEAWAY_TITLES) {
    const { data } = await admin
      .from("giveaways")
      .select("id,title,entry_mode,status,ends_at")
      .ilike("title", `%${title}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  const { data: all } = await admin
    .from("giveaways")
    .select("id,title,entry_mode,status,ends_at")
    .ilike("title", "%t-shirt%")
    .limit(1)
    .maybeSingle();
  return all;
}

async function pickParticipantIds(limit = 10) {
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const ids = [...new Set((memberships ?? []).map((m) => m.user_id))];
  if (ids.length < limit) {
    const { data: profiles } = await admin.from("profiles").select("id").eq("role", "member");
    for (const p of profiles ?? []) {
      if (!ids.includes(p.id)) ids.push(p.id);
      if (ids.length >= limit) break;
    }
  }
  return ids.slice(0, limit);
}

async function seedEntries(giveaway, userIds) {
  let added = 0;
  for (const userId of userIds) {
    const { error } = await admin.from("giveaway_entries").upsert(
      { giveaway_id: giveaway.id, user_id: userId, is_eligible: true },
      { onConflict: "giveaway_id,user_id", ignoreDuplicates: false },
    );
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.warn(`  Teilnahme ${userId}: ${error.message}`);
      continue;
    }
    added += 1;

    if (giveaway.entry_mode === "quiz") {
      const { data: entry } = await admin
        .from("giveaway_entries")
        .select("id")
        .eq("giveaway_id", giveaway.id)
        .eq("user_id", userId)
        .maybeSingle();
      const { data: questions } = await admin
        .from("giveaway_questions")
        .select("id")
        .eq("giveaway_id", giveaway.id)
        .order("sort_order");
      for (const q of questions ?? []) {
        const { data: options } = await admin
          .from("giveaway_question_options")
          .select("id,is_correct")
          .eq("question_id", q.id)
          .order("sort_order");
        const correct = options?.find((o) => o.is_correct) ?? options?.[0];
        if (entry?.id && correct?.id) {
          await admin.from("giveaway_entry_answers").upsert(
            { entry_id: entry.id, question_id: q.id, option_id: correct.id },
            { onConflict: "entry_id,question_id", ignoreDuplicates: true },
          );
        }
      }
    }
  }
  console.log(`Teilnahmen: ${added} Mitglieder am Gewinnspiel „${giveaway.title}"`);
}

async function seedComments(giveawayId, userIds) {
  const { data: existing } = await admin
    .from("giveaway_comments")
    .select("id")
    .eq("giveaway_id", giveawayId);
  if ((existing ?? []).length >= 8) {
    console.log(`Kommentare: ${existing.length} bereits vorhanden — übersprungen`);
    return;
  }

  let count = 0;
  const patterns = [
    [0, 2],
    [1, 0],
    [2, 3],
    [3, 1],
    [4, 0],
    [5, 2],
    [6, 1],
    [7, 0],
    [8, 4],
    [9, 1],
  ];

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const [, commentCount] = patterns[i] ?? [i, i % 3];
    for (let c = 0; c < commentCount; c++) {
      const body = COMMENTS[(i * 3 + c) % COMMENTS.length];
      const { error } = await admin.from("giveaway_comments").insert({
        giveaway_id: giveawayId,
        author_id: userId,
        body,
      });
      if (!error) count += 1;
    }
  }
  console.log(`Kommentare: ${count} neu (ungleich verteilt)`);
}

async function seedPoints(userIds, giveawayId) {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { data: polls } = await admin.from("polls").select("id").limit(3);
  const { data: posts } = await admin
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .limit(8);

  const bundles = [
    [
      { points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls?.[0]?.id },
      { points: 3, reason: "post_comment", entity_type: "post", entity_id: posts?.[0]?.id },
      { points: 2, reason: "giveaway_entry", entity_type: "giveaway", entity_id: giveawayId },
    ],
    [
      { points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls?.[1]?.id },
      { points: 7, reason: "event_participation", entity_type: "event", entity_id: posts?.[1]?.id },
      { points: 1, reason: "post_like", entity_type: "post", entity_id: posts?.[1]?.id },
    ],
    [
      { points: 10, reason: "post_like", entity_type: "post", entity_id: posts?.[2]?.id },
      { points: 3, reason: "post_comment", entity_type: "post", entity_id: posts?.[3]?.id },
      { points: 2, reason: "giveaway_like", entity_type: "giveaway", entity_id: giveawayId },
    ],
    [
      { points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls?.[0]?.id },
      { points: 4, reason: "giveaway_comment", entity_type: "giveaway", entity_id: giveawayId },
    ],
    [
      { points: 6, reason: "post_comment", entity_type: "post", entity_id: posts?.[4]?.id },
      { points: 2, reason: "giveaway_entry", entity_type: "giveaway", entity_id: giveawayId },
    ],
    [
      { points: 8, reason: "event_participation", entity_type: "event", entity_id: posts?.[5]?.id },
      { points: 1, reason: "post_like", entity_type: "post", entity_id: posts?.[0]?.id },
    ],
    [
      { points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls?.[2]?.id },
      { points: 5, reason: "post_comment", entity_type: "post", entity_id: posts?.[6]?.id },
      { points: 3, reason: "giveaway_comment", entity_type: "giveaway", entity_id: giveawayId },
    ],
    [
      { points: 2, reason: "giveaway_entry", entity_type: "giveaway", entity_id: giveawayId },
      { points: 4, reason: "post_like", entity_type: "post", entity_id: posts?.[7]?.id },
    ],
    [
      { points: 9, reason: "post_comment", entity_type: "post", entity_id: posts?.[2]?.id },
      { points: 5, reason: "poll_vote", entity_type: "poll", entity_id: polls?.[1]?.id },
    ],
    [
      { points: 7, reason: "event_participation", entity_type: "event", entity_id: posts?.[3]?.id },
      { points: 2, reason: "giveaway_like", entity_type: "giveaway", entity_id: giveawayId },
      { points: 1, reason: "post_like", entity_type: "post", entity_id: posts?.[4]?.id },
    ],
  ];

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const rows = (bundles[i] ?? bundles[0]).filter((r) => r.entity_id);
    let total = 0;
    for (const row of rows) {
      const { error } = await admin.from("points_transactions").insert({
        user_id: userId,
        points: row.points,
        reason: row.reason,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        created_at: yearStart,
      });
      if (error && !/duplicate|unique/i.test(error.message)) {
        console.warn(`  Punkte ${userId}: ${error.message}`);
      } else if (!error) {
        total += row.points;
      }
    }
    console.log(`  ${userId.slice(0, 8)}… → +${total} Statuspunkte (Bundle ${i + 1})`);
  }
}

async function seedPostComments(userIds) {
  const { data: posts } = await admin
    .from("posts")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);
  if (!posts?.length) {
    console.log("Feed-Kommentare: keine Beiträge");
    return;
  }

  let count = 0;
  for (let pi = 0; pi < posts.length; pi++) {
    for (let ui = 0; ui < userIds.length; ui++) {
      if ((ui + pi) % 4 !== 0 && (ui * pi) % 5 !== 0) continue;
      const { error } = await admin.from("post_comments").insert({
        post_id: posts[pi].id,
        author_id: userIds[ui],
        body: COMMENTS[(pi + ui * 2) % COMMENTS.length],
      });
      if (!error) count += 1;
    }
  }
  console.log(`Feed-Kommentare: ${count} neu (ungleich verteilt)`);
}

async function main() {
  const giveaway = await findGiveaway();
  if (!giveaway) {
    console.error("Kein Gewinnspiel mit „Fanclub T-Shirt“ gefunden.");
    process.exit(1);
  }
  console.log(`Gewinnspiel: ${giveaway.title} (${giveaway.id})\n`);

  const userIds = await pickParticipantIds(10);
  if (userIds.length < 10) {
    console.warn(`Nur ${userIds.length} Mitglieder gefunden — nutze alle.`);
  }

  await seedEntries(giveaway, userIds);
  await seedComments(giveaway.id, userIds);
  await seedPostComments(userIds);
  console.log("\nPunkte (unterschiedlich pro Teilnehmer):");
  await seedPoints(userIds, giveaway.id);

  console.log("\nFertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
