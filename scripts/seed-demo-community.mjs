/**
 * Demo-Community für Optik-/Flow-Tests (Mitglieder bleiben).
 * - 3 Gewinnspiele: simple / quiz / question
 * - Admin- + Mitglieder-Posts, Kommentare, Likes (ca. 2 Monate gestaffelt)
 * - Geburtstagsgrüße rückwirkend (Geburtstage in den letzten ~60 Tagen)
 *
 *   npm run seed:demo-community
 *   node --env-file=.env.local scripts/seed-demo-community.mjs
 *
 * Später vor Go-Live:
 *   npm run wipe:community
 */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 60;

const BIRTHDAY_TEMPLATES = [
  {
    title: "Alles Gute, {{first_name}}! 🎂",
    body: "{{salutation}}, wir wünschen dir alles Gute zu deinem Geburtstag — dein Anni Perka Fanclub.",
  },
  {
    title: "Happy Birthday! 🎉",
    body: "{{salutation}}, der Fanclub feiert dich: alles Liebe zum Geburtstag!",
  },
  {
    title: "Geburtstagsgrüße",
    body: "{{salutation}}, herzlichen Glückwunsch und viel Freude an deinem besonderen Tag!",
  },
];

const ADMIN_POSTS = [
  {
    title: "Willkommen in der Fanclub-App",
    body: "Hier teilen wir News, Events und gemeinsame Aktionen. Schreibt gerne mit — wir freuen uns auf euch!",
  },
  {
    title: "Nächste Konzerte im Blick",
    body: "Schaut unter Events, wer von euch dabei ist. Reiseinfos pflegen wir laufend nach.",
  },
  {
    title: "Anni-Stars & Punkte",
    body: "Mit Likes, Kommentaren und Teilnahmen an Umfragen & Gewinnspielen sammelt ihr Anni-Stars. Am Jahresende winkt etwas Besonderes.",
  },
];

const MEMBER_POST_BODIES = [
  { title: "War gestern mega!", body: "Die Stimmung war unglaublich — wer war noch dabei?" },
  { title: "Playlist-Tipp", body: "Welche Songs von Anni hört ihr gerade am häufigsten?" },
  { title: "Fanclub-Liebe", body: "Schön, dass es diesen Verein gibt. Danke an alle Helferinnen und Helfer!" },
  { title: "Autogramm-Erinnerung", body: "Hat jemand noch ein Foto vom letzten Meet & Greet?" },
  { title: "Reisetipp", body: "Für Jesolo planen wir schon — wer fährt mit zum Schlagerflair?" },
  { title: "Radio gehört", body: "Gerade Anni im Radio erwischt — sofort mitgesungen 😄" },
  { title: "Merch-Frage", body: "Kommt bald wieder Fanclub-Merch? Ich wäre dabei!" },
  { title: "Geburtstagsfeier geplant", body: "Wer hat Lust, gemeinsam zu feiern, wenn Anni Geburtstag hat?" },
];

const COMMENT_TEXTS = [
  "Genau so!",
  "Da bin ich dabei 🙌",
  "Danke fürs Teilen!",
  "Klingt gut!",
  "Freu mich schon",
  "Super Idee",
  "War auch so schön",
  "Alles Liebe!",
  "Herzlichen Glückwunsch 🎂",
  "Nachfeiern müssen wir!",
];

function hashInt(s) {
  const h = createHash("sha256").update(String(s)).digest();
  return h.readUInt32BE(0);
}

function pick(arr, seed) {
  return arr[hashInt(seed) % arr.length];
}

function daysAgoIso(days, hour = 10, minute = 0) {
  const d = new Date(Date.now() - days * DAY_MS);
  d.setHours(hour, minute, Math.floor(hashInt(String(days)) % 50), 0);
  return d.toISOString();
}

function berlinYmd(d = new Date()) {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

function addDaysYmd(ymd, days) {
  const d = new Date(`${ymd}T12:00:00+02:00`);
  d.setDate(d.getDate() + days);
  return berlinYmd(d);
}

function salutation(name, gender) {
  const n = (name || "Fan").trim();
  if (gender === "m") return `Lieber ${n}`;
  if (gender === "w") return `Liebe ${n}`;
  return `Hallo ${n}`;
}

function renderBirthday(firstName, gender, userId, dateIso) {
  const t = pick(BIRTHDAY_TEMPLATES, `${userId}:${dateIso}`);
  const s = salutation(firstName, gender);
  return {
    title: t.title.replace(/\{\{first_name\}\}/g, firstName.trim() || "Fan"),
    body: t.body
      .replace(/\{\{first_name\}\}/g, firstName.trim() || "Fan")
      .replace(/\{\{salutation\}\}/g, s),
  };
}

async function setCreatedAt(table, id, iso, idCol = "id") {
  const { error } = await admin.from(table).update({ created_at: iso }).eq(idCol, id);
  if (error) console.warn(`created_at ${table}:`, error.message);
}

async function loadActors() {
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id,first_name,last_name,role,birthdate,gender,membership_number")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!adminProfile?.id) throw new Error("Kein Admin gefunden.");

  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const active = new Set((memberships ?? []).map((m) => m.user_id));

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,role,birthdate,gender,membership_number")
    .eq("role", "member")
    .order("membership_number", { ascending: true, nullsFirst: false });

  const members = (profiles ?? []).filter((p) => active.has(p.id));
  if (members.length < 5) throw new Error(`Zu wenige aktive Mitglieder (${members.length}).`);

  return { adminProfile, members };
}

async function seedGiveaways(adminId, members) {
  console.log("\n— Gewinnspiele —");

  // 1) simple
  const endsSimple = new Date(Date.now() + 14 * DAY_MS).toISOString();
  const { data: gSimple, error: e1 } = await admin
    .from("giveaways")
    .insert({
      author_id: adminId,
      title: "Demo: Fanclub-T-Shirt",
      description:
        "Einfache Teilnahme — ein Klick genügt. Unter allen Teilnehmenden verlosen wir ein Fanclub-T-Shirt.",
      entry_mode: "simple",
      ends_at: endsSimple,
      status: "active",
      is_active: true,
      is_paused: false,
    })
    .select("id")
    .single();
  if (e1) throw e1;
  await admin.from("giveaway_prizes").insert({
    giveaway_id: gSimple.id,
    name: "Fanclub-T-Shirt (Größe nach Wahl)",
    sort_order: 0,
  });
  const simpleParticipants = members.filter((_, i) => hashInt(`simple:${i}`) % 3 !== 0);
  for (const m of simpleParticipants) {
    await admin.from("giveaway_entries").insert({
      giveaway_id: gSimple.id,
      user_id: m.id,
      is_eligible: true,
    });
  }
  console.log(`simple: ${simpleParticipants.length} Teilnahmen`);

  // 2) quiz
  const endsQuiz = new Date(Date.now() + 10 * DAY_MS).toISOString();
  const { data: gQuiz, error: e2 } = await admin
    .from("giveaways")
    .insert({
      author_id: adminId,
      title: "Demo: Konzerttickets Quiz",
      description:
        "Beantworte die drei Fragen richtig und sichere dir die Chance auf zwei Konzerttickets.",
      entry_mode: "quiz",
      ends_at: endsQuiz,
      status: "active",
      is_active: true,
      is_paused: false,
    })
    .select("id")
    .single();
  if (e2) throw e2;
  await admin.from("giveaway_prizes").insert([
    { giveaway_id: gQuiz.id, name: "2× Konzerttickets", sort_order: 0 },
    { giveaway_id: gQuiz.id, name: "Fanclub-Set (Sticker & Autogrammkarte)", sort_order: 1 },
  ]);

  const quizDefs = [
    {
      q: "In welcher Stadt wohnt Anni Perka?",
      options: [
        { label: "Berlin", correct: false },
        { label: "Rostock", correct: true },
        { label: "Hamburg", correct: false },
      ],
    },
    {
      q: "Wie heißt der Fanclub offiziell?",
      options: [
        { label: "Anni Perka Fanclub", correct: true },
        { label: "Perka United", correct: false },
        { label: "Ostsee Stars", correct: false },
      ],
    },
    {
      q: "Welches Format ist KEINE typische Fanclub-Aktion?",
      options: [
        { label: "Gewinnspiele", correct: false },
        { label: "Börsengang", correct: true },
        { label: "Events & Treffen", correct: false },
      ],
    },
  ];

  const quizQuestionIds = [];
  const quizCorrectByQ = [];
  for (let qi = 0; qi < quizDefs.length; qi++) {
    const def = quizDefs[qi];
    const { data: qRow, error: qErr } = await admin
      .from("giveaway_questions")
      .insert({
        giveaway_id: gQuiz.id,
        question_text: def.q,
        sort_order: qi,
      })
      .select("id")
      .single();
    if (qErr) throw qErr;
    quizQuestionIds.push(qRow.id);
    const optionIds = [];
    let correctId = null;
    for (let oi = 0; oi < def.options.length; oi++) {
      const opt = def.options[oi];
      const { data: oRow, error: oErr } = await admin
        .from("giveaway_question_options")
        .insert({
          question_id: qRow.id,
          label: opt.label,
          is_correct: opt.correct,
          sort_order: oi,
        })
        .select("id")
        .single();
      if (oErr) throw oErr;
      optionIds.push(oRow.id);
      if (opt.correct) correctId = oRow.id;
    }
    quizCorrectByQ.push({ questionId: qRow.id, correctId, optionIds });
  }

  let quizOk = 0;
  let quizFail = 0;
  for (let i = 0; i < members.length; i++) {
    if (hashInt(`quiz:${members[i].id}`) % 5 === 0) continue; // manche nehmen nicht teil
    const eligible = hashInt(`quiz-ok:${members[i].id}`) % 4 !== 0; // ~75% richtig
    const { data: entry, error: enErr } = await admin
      .from("giveaway_entries")
      .insert({
        giveaway_id: gQuiz.id,
        user_id: members[i].id,
        is_eligible: eligible,
      })
      .select("id")
      .single();
    if (enErr) continue;
    for (const q of quizCorrectByQ) {
      const optionId = eligible
        ? q.correctId
        : q.optionIds.find((id) => id !== q.correctId) ?? q.optionIds[0];
      await admin.from("giveaway_entry_answers").insert({
        entry_id: entry.id,
        question_id: q.questionId,
        option_id: optionId,
      });
    }
    if (eligible) quizOk += 1;
    else quizFail += 1;
  }
  console.log(`quiz: ${quizOk} berechtigt, ${quizFail} falsch`);

  // 3) question (Meinung)
  const endsQ = new Date(Date.now() + 21 * DAY_MS).toISOString();
  const { data: gQuestion, error: e3 } = await admin
    .from("giveaways")
    .insert({
      author_id: adminId,
      title: "Demo: Autogrammkarte — eure Meinung",
      description:
        "Sagt uns, welches Motiv euch am besten gefällt. Alle Antworten nehmen an der Auslosung teil.",
      entry_mode: "question",
      ends_at: endsQ,
      status: "active",
      is_active: true,
      is_paused: false,
    })
    .select("id")
    .single();
  if (e3) throw e3;
  await admin.from("giveaway_prizes").insert({
    giveaway_id: gQuestion.id,
    name: "Signierte Autogrammkarte",
    sort_order: 0,
  });
  const { data: opinionQ, error: oqErr } = await admin
    .from("giveaway_questions")
    .insert({
      giveaway_id: gQuestion.id,
      question_text: "Welches Motiv soll die nächste Autogrammkarte haben?",
      sort_order: 0,
    })
    .select("id")
    .single();
  if (oqErr) throw oqErr;
  const opinionLabels = [
    "Bühnenfoto",
    "Portrait schwarz-weiß",
    "Strand / Ostsee",
    "Fanclub-Logo",
  ];
  const opinionOpts = [];
  for (let i = 0; i < opinionLabels.length; i++) {
    const { data: o, error } = await admin
      .from("giveaway_question_options")
      .insert({
        question_id: opinionQ.id,
        label: opinionLabels[i],
        is_correct: false,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error) throw error;
    opinionOpts.push(o.id);
  }

  let opinionN = 0;
  for (const m of members) {
    if (hashInt(`opinion:${m.id}`) % 2 === 0) continue;
    const { data: entry, error } = await admin
      .from("giveaway_entries")
      .insert({
        giveaway_id: gQuestion.id,
        user_id: m.id,
        is_eligible: true,
      })
      .select("id")
      .single();
    if (error) continue;
    await admin.from("giveaway_entry_answers").insert({
      entry_id: entry.id,
      question_id: opinionQ.id,
      option_id: pick(opinionOpts, `op:${m.id}`),
    });
    opinionN += 1;
  }
  console.log(`question: ${opinionN} Teilnahmen`);

  // Giveaway likes/comments (gestaffelt)
  for (const g of [gSimple, gQuiz, gQuestion]) {
    for (const m of members.slice(0, 20)) {
      if (hashInt(`glike:${g.id}:${m.id}`) % 3 !== 0) continue;
      await admin.from("giveaway_likes").insert({
        giveaway_id: g.id,
        user_id: m.id,
      });
    }
    for (let i = 0; i < 8; i++) {
      const m = members[hashInt(`gcom:${g.id}:${i}`) % members.length];
      const { data: c } = await admin
        .from("giveaway_comments")
        .insert({
          giveaway_id: g.id,
          author_id: m.id,
          body: pick(COMMENT_TEXTS, `gcom:${g.id}:${i}`),
        })
        .select("id")
        .single();
      if (c?.id) await setCreatedAt("giveaway_comments", c.id, daysAgoIso(5 + i * 2, 15));
    }
  }
}

async function seedPostsAndEngagement(adminProfile, members) {
  console.log("\n— Posts / Kommentare / Likes —");
  const postIds = [];

  for (let i = 0; i < ADMIN_POSTS.length; i++) {
    const created = daysAgoIso(50 - i * 7, 9);
    const { data: p, error } = await admin
      .from("posts")
      .insert({
        author_id: adminProfile.id,
        author_role: "admin",
        title: ADMIN_POSTS[i].title,
        body: ADMIN_POSTS[i].body,
        status: "approved",
        approved_at: created,
        approved_by: adminProfile.id,
        last_activity_at: created,
        created_at: created,
      })
      .select("id")
      .single();
    if (error) throw error;
    await setCreatedAt("posts", p.id, created);
    await admin
      .from("posts")
      .update({ last_activity_at: created, approved_at: created })
      .eq("id", p.id);
    postIds.push({ id: p.id, createdDays: 50 - i * 7 });
  }

  const authorPool = members.slice(0, Math.min(40, members.length));
  for (let i = 0; i < MEMBER_POST_BODIES.length; i++) {
    const author = authorPool[i % authorPool.length];
    const days = 45 - i * 4;
    const created = daysAgoIso(days, 12 + (i % 6));
    const { data: p, error } = await admin
      .from("posts")
      .insert({
        author_id: author.id,
        author_role: "member",
        title: MEMBER_POST_BODIES[i].title,
        body: MEMBER_POST_BODIES[i].body,
        status: "approved",
        approved_at: created,
        approved_by: adminProfile.id,
        last_activity_at: created,
        created_at: created,
      })
      .select("id")
      .single();
    if (error) {
      console.warn("member post:", error.message);
      continue;
    }
    await setCreatedAt("posts", p.id, created);
    await admin
      .from("posts")
      .update({ last_activity_at: created, approved_at: created })
      .eq("id", p.id);
    postIds.push({ id: p.id, createdDays: days });
  }

  // 2 pending member posts for moderation UI
  for (let i = 0; i < 2; i++) {
    const author = members[(members.length - 1 - i) % members.length];
    const { error } = await admin.from("posts").insert({
      author_id: author.id,
      author_role: "member",
      title: i === 0 ? "Noch in Prüfung" : "Wartet auf Freigabe",
      body: "Das ist ein Demo-Beitrag im Status „ausstehend“, damit die Moderationsliste etwas zeigt.",
      status: "pending",
      last_activity_at: new Date().toISOString(),
    });
    if (error) console.warn("pending post:", error.message);
  }

  let likes = 0;
  let comments = 0;
  for (const post of postIds) {
    const likeCount = 2 + (hashInt(post.id) % 12);
    const shuffled = [...members].sort(
      (a, b) => hashInt(`L:${post.id}:${a.id}`) - hashInt(`L:${post.id}:${b.id}`),
    );
    for (let i = 0; i < Math.min(likeCount, shuffled.length); i++) {
      const likeAt = daysAgoIso(Math.max(0, post.createdDays - 1), 18);
      const { error } = await admin.from("post_likes").insert({
        post_id: post.id,
        user_id: shuffled[i].id,
        created_at: likeAt,
      });
      if (!error) {
        likes += 1;
        await admin
          .from("post_likes")
          .update({ created_at: likeAt })
          .eq("post_id", post.id)
          .eq("user_id", shuffled[i].id);
      }
    }

    const commentCount = 1 + (hashInt(`c:${post.id}`) % 6);
    let lastAct = daysAgoIso(Math.max(0, post.createdDays - 1), 20);
    for (let i = 0; i < commentCount; i++) {
      const author = shuffled[(i * 3) % shuffled.length];
      const created = daysAgoIso(Math.max(0, post.createdDays - 1 - i), 14 + i);
      const { data: c, error } = await admin
        .from("post_comments")
        .insert({
          post_id: post.id,
          author_id: author.id,
          body: pick(COMMENT_TEXTS, `pc:${post.id}:${i}`),
          created_at: created,
        })
        .select("id")
        .single();
      if (error) continue;
      await setCreatedAt("post_comments", c.id, created);
      comments += 1;
      lastAct = created;
    }
    await admin.from("posts").update({ last_activity_at: lastAct }).eq("id", post.id);
  }

  console.log(`Posts approved: ${postIds.length}, Likes: ${likes}, Kommentare: ${comments}`);
  return postIds;
}

async function seedBirthdayPosts(adminProfile, members) {
  console.log("\n— Geburtstage (rückwirkend) —");
  const today = berlinYmd();
  let created = 0;

  // Members whose birthday MM-DD falls in the last WINDOW_DAYS
  for (let offset = 1; offset <= WINDOW_DAYS; offset++) {
    const dateIso = addDaysYmd(today, -offset);
    const md = dateIso.slice(5); // MM-DD
    const birthdayPeople = members.filter((m) => {
      if (!m.birthdate) return false;
      return String(m.birthdate).slice(5, 10) === md;
    });

    for (const p of birthdayPeople) {
      const { title, body } = renderBirthday(p.first_name, p.gender, p.id, dateIso);
      const createdAt = `${dateIso}T07:05:00.000Z`;
      const { data: post, error } = await admin
        .from("posts")
        .insert({
          author_id: null,
          author_role: "anni",
          title,
          body,
          status: "approved",
          is_birthday: true,
          birthday_date: dateIso,
          birthday_user_id: p.id,
          last_activity_at: createdAt,
          created_at: createdAt,
          approved_at: createdAt,
        })
        .select("id")
        .single();
      if (error) {
        if (!/unique|duplicate/i.test(error.message)) {
          console.warn(`birthday ${p.first_name}:`, error.message);
        }
        continue;
      }
      await setCreatedAt("posts", post.id, createdAt);
      await admin
        .from("posts")
        .update({ last_activity_at: createdAt, approved_at: createdAt })
        .eq("id", post.id);

      // Greetings
      const greeters = members
        .filter((m) => m.id !== p.id)
        .sort((a, b) => hashInt(`b:${post.id}:${a.id}`) - hashInt(`b:${post.id}:${b.id}`))
        .slice(0, 3 + (hashInt(post.id) % 5));
      let last = createdAt;
      for (let i = 0; i < greeters.length; i++) {
        const cAt = new Date(new Date(createdAt).getTime() + (i + 1) * 3 * 60 * 60 * 1000).toISOString();
        const { data: c } = await admin
          .from("post_comments")
          .insert({
            post_id: post.id,
            author_id: greeters[i].id,
            body: pick(
              [
                "Alles Gute! 🎂",
                "Herzlichen Glückwunsch!",
                "Nachfeiern müssen wir 😄",
                "Schönsten Glückwunsch vom Fanclub!",
                "Genieß deinen Tag!",
              ],
              `bg:${post.id}:${i}`,
            ),
            created_at: cAt,
          })
          .select("id")
          .single();
        if (c?.id) {
          await setCreatedAt("post_comments", c.id, cAt);
          last = cAt;
        }
      }
      await admin.from("posts").update({ last_activity_at: last }).eq("id", post.id);
      created += 1;
      console.log(`  ${dateIso} → ${p.first_name} ${p.last_name}`);
    }
  }

  // If too few natural birthdays in window, fabricate a few using recent dates
  if (created < 4) {
    console.log("  (wenige natürliche Geburtstage — ergänze Demo-Grüße)");
    for (let i = 0; i < 5; i++) {
      const p = members[i * 3 % members.length];
      const dateIso = addDaysYmd(today, -(8 + i * 9));
      const { title, body } = renderBirthday(p.first_name, p.gender, p.id, dateIso);
      const createdAt = `${dateIso}T07:05:00.000Z`;
      const { data: post, error } = await admin
        .from("posts")
        .insert({
          author_id: null,
          author_role: "anni",
          title,
          body,
          status: "approved",
          is_birthday: true,
          birthday_date: dateIso,
          birthday_user_id: p.id,
          last_activity_at: createdAt,
          created_at: createdAt,
        })
        .select("id")
        .single();
      if (error) continue;
      await setCreatedAt("posts", post.id, createdAt);
      created += 1;
      console.log(`  + ${dateIso} → ${p.first_name} ${p.last_name}`);
    }
  }

  console.log(`Geburtstags-Posts: ${created}`);
}

async function backdatePoints() {
  // Spread recent points_transactions over the window for a natural timeline
  const { data: rows } = await admin
    .from("points_transactions")
    .select("id,created_at")
    .order("created_at", { ascending: false })
    .limit(800);
  let n = 0;
  for (const row of rows ?? []) {
    const days = hashInt(row.id) % WINDOW_DAYS;
    const iso = daysAgoIso(days, 11);
    const { error } = await admin
      .from("points_transactions")
      .update({ created_at: iso })
      .eq("id", row.id);
    if (!error) n += 1;
  }
  console.log(`\nPunkte-Zeitstempel angepasst: ${n}`);
}

async function main() {
  console.log("=== Demo-Community Seed ===");
  const { adminProfile, members } = await loadActors();
  console.log(`Admin: ${adminProfile.first_name} ${adminProfile.last_name}`);
  console.log(`Aktive Mitglieder: ${members.length}`);

  await seedGiveaways(adminProfile.id, members);
  await seedPostsAndEngagement(adminProfile, members);
  await seedBirthdayPosts(adminProfile, members);
  await backdatePoints();

  console.log("\nFertig. Vor Go-Live: npm run wipe:community");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
