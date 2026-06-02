import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const TEST_EMAILS = [
  "max.wagner.test@peter-loder.de",
  "lena.hoffmann.test@peter-loder.de",
  "jonas.becker.test@peter-loder.de",
];

const polls = [
  {
    question: "Welches Merch wünscht ihr euch als Nächstes?",
    allow_multiple: false,
    days: 30,
    options: ["T-Shirt", "Hoodie", "Cap", "Poster"],
    votes: [0, 1, 2, 0, 1, 3],
  },
  {
    question: "Welche Städte sollen auf der Tour unbedingt dabei sein? (Mehrfach)",
    allow_multiple: true,
    days: 45,
    options: ["Berlin", "Hamburg", "München", "Köln", "Frankfurt"],
    votes: [
      [0, 2],
      [1, 3],
      [0, 1, 4],
      [2],
      [3, 4],
    ],
  },
  {
    question: "Lieblings-Song für die nächste Setlist?",
    allow_multiple: false,
    days: 21,
    options: ["Song A", "Song B", "Song C"],
    votes: [0, 0, 1, 2, 1, 2, 0],
  },
];

async function main() {
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 200,
  });
  if (listErr) throw listErr;

  const testUsers = TEST_EMAILS.map((email) => {
    const u = users.users.find((x) => x.email === email);
    if (!u) throw new Error(`Test user not found: ${email}. Run create-test-users.mjs first.`);
    return u;
  });

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  const authorId = adminProfile?.id ?? testUsers[0].id;

  for (const p of polls) {
    const ends = new Date();
    ends.setDate(ends.getDate() + p.days);

    const { data: poll, error: pollErr } = await admin
      .from("polls")
      .insert({
        author_id: authorId,
        question: p.question,
        allow_multiple: p.allow_multiple,
        ends_at: ends.toISOString(),
        is_active: true,
      })
      .select("id")
      .single();
    if (pollErr) throw pollErr;

    const { data: opts, error: optErr } = await admin
      .from("poll_options")
      .insert(
        p.options.map((label, i) => ({
          poll_id: poll.id,
          label,
          sort_order: i,
        })),
      )
      .select("id,sort_order");
    if (optErr) throw optErr;

    const optByIndex = [...opts].sort((a, b) => a.sort_order - b.sort_order);

    if (p.allow_multiple) {
      let ui = 0;
      for (const indices of p.votes) {
        const user = testUsers[ui % testUsers.length];
        ui++;
        const rows = indices.map((idx) => ({
          poll_id: poll.id,
          user_id: user.id,
          option_id: optByIndex[idx].id,
        }));
        const { error: vErr } = await admin.from("poll_votes").insert(rows);
        if (vErr) throw vErr;
      }
    } else {
      let ui = 0;
      for (const idx of p.votes) {
        const user = testUsers[ui % testUsers.length];
        ui++;
        const { error: vErr } = await admin.from("poll_votes").insert({
          poll_id: poll.id,
          user_id: user.id,
          option_id: optByIndex[idx].id,
        });
        if (vErr) throw vErr;
      }
    }

    console.log("Created poll:", p.question);
  }

  console.log("Done. 3 test polls with votes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
