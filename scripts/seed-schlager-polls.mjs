/**
 * Zwei Umfragen mit fiktiven Teilnehmern und Kommentaren.
 *
 * npx tsx --env-file=.env.local scripts/seed-schlager-polls.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const POLLS = [
  {
    question: "Wer ist eure Lieblings Schlagerkünstlerin?",
    allow_multiple: false,
    days: 60,
    options: ["Anni Perka", "Helen Fischer", "Kerstin Ott"],
    votes: [0, 0, 1, 2, 0, 1, 2, 0, 1, 0],
    comments: [
      "Anni natürlich! ❤️",
      "Schwer zu entscheiden, aber Helene!",
      "Kerstin Ott hat so viel Gefühl in der Stimme.",
      "Alle drei sind klasse — ich wähle Anni.",
      "Helene Fischer ist einfach eine Ikone.",
    ],
  },
  {
    question: "Schaut ihr noch die Silbereisen Shows?",
    allow_multiple: false,
    days: 45,
    options: ["Ja", "Nein"],
    votes: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    comments: [
      "Immer wenn ich kann!",
      "Leider keine Zeit mehr.",
      "Ja, mit der ganzen Familie.",
      "Früher ja, heute eher Spotify.",
      "Silbereisen gehört einfach dazu.",
      "Nein, schaue lieber Konzerte live.",
    ],
  },
];

const COMMENTS_EXTRA = [
  "Gute Frage!",
  "Bin gespannt auf das Ergebnis.",
  "Hab auch schon abgestimmt.",
];

async function pickMemberIds(limit = 12) {
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const ids = [...new Set((memberships ?? []).map((m) => m.user_id))];
  if (ids.length >= limit) return ids.slice(0, limit);
  const { data: profiles } = await admin.from("profiles").select("id").neq("role", "admin");
  for (const p of profiles ?? []) {
    if (!ids.includes(p.id)) ids.push(p.id);
    if (ids.length >= limit) break;
  }
  return ids.slice(0, limit);
}

async function findExistingPoll(question) {
  const { data } = await admin
    .from("polls")
    .select("id,question")
    .eq("question", question)
    .maybeSingle();
  return data;
}

async function main() {
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  const memberIds = await pickMemberIds(12);
  if (!memberIds.length) {
    console.error("Keine Mitglieder gefunden.");
    process.exit(1);
  }
  const authorId = adminProfile?.id ?? memberIds[0];

  for (const p of POLLS) {
    const existing = await findExistingPoll(p.question);
    if (existing) {
      console.log(`Übersprungen (existiert): ${p.question}`);
      continue;
    }

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
    let voteCount = 0;

    for (let i = 0; i < p.votes.length && i < memberIds.length; i++) {
      const userId = memberIds[i];
      const idx = p.votes[i];
      await admin.from("poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId);
      const { error: vErr } = await admin.from("poll_votes").insert({
        poll_id: poll.id,
        user_id: userId,
        option_id: optByIndex[idx].id,
      });
      if (!vErr) voteCount += 1;
    }

    let commentCount = 0;
    const allComments = [...p.comments, ...COMMENTS_EXTRA];
    for (let i = 0; i < allComments.length; i++) {
      if (i % 3 === 2 && i > 4) continue;
      const userId = memberIds[(i + 1) % memberIds.length];
      const { error: cErr } = await admin.from("poll_comments").insert({
        poll_id: poll.id,
        author_id: userId,
        body: allComments[i],
      });
      if (!cErr) commentCount += 1;
    }

    console.log(`✓ ${p.question}`);
    console.log(`  ${voteCount} Stimmen, ${commentCount} Kommentare`);
  }

  console.log("\nFertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
