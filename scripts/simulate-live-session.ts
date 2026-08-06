/**
 * Live-Session Test: legt Session an, mailt Host-Link an Anni (Peter),
 * 8 Bot-Mitglieder chatten und stellen laufend Fragen.
 *
 *   npx tsx --env-file=.env.local scripts/simulate-live-session.ts
 *
 * Optional:
 *   LIVE_SIM_TO=mail@peter-loder.de
 *   LIVE_SIM_MINUTES=10
 *   LIVE_SIM_END=1   → nur Session beenden / Bots belassen
 */
import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendEmailViaAccount } from "../src/lib/smtp/send-via-account";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const TO = process.env.LIVE_SIM_TO ?? "mail@peter-loder.de";
const MINUTES = Math.max(2, Number(process.env.LIVE_SIM_MINUTES ?? "12") || 12);
const BASE = (
  process.env.APP_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://fanclub.anniperka.de"
).replace(/\/$/, "");
const BOT_PASSWORD = "LiveSim!23456";

const BOTS = [
  { email: "live.sim.01@fanclub-portal.test", first: "Lisa", last: "Neumann" },
  { email: "live.sim.02@fanclub-portal.test", first: "Tom", last: "Schneider" },
  { email: "live.sim.03@fanclub-portal.test", first: "Mia", last: "Fischer" },
  { email: "live.sim.04@fanclub-portal.test", first: "Jonas", last: "Weber" },
  { email: "live.sim.05@fanclub-portal.test", first: "Emma", last: "Becker" },
  { email: "live.sim.06@fanclub-portal.test", first: "Leon", last: "Hoffmann" },
  { email: "live.sim.07@fanclub-portal.test", first: "Nora", last: "Schulz" },
  { email: "live.sim.08@fanclub-portal.test", first: "Felix", last: "Wagner" },
] as const;

const CHAT_LINES = [
  "Hallo zusammen 👋 schon jemand da?",
  "Ich bin so gespannt!!",
  "Läuft bei euch das Video schon?",
  "Schön, dass Anni das macht ❤️",
  "Wer stellt die erste Frage?",
  "Ich war letztes Jahr beim Konzert in Hamburg!",
  "Mikro von Anni klingt gut bei mir",
  "Können wir auch später noch Fragen stellen?",
  "Liebes Fanclub-Team, danke fürs Organisieren",
  "Meine Tochter hört auch mit 😄",
  "Wann kommt das nächste Album? 🙊",
  "Chat ist voll hier haha",
  "Hallo aus München!",
  "Gleich stelle ich eine Frage…",
  "Anni sieht total entspannt aus",
];

const QUESTIONS = [
  "Was war dein schönstes Konzert-Erlebnis bisher?",
  "Arbeitest du schon an neuen Songs?",
  "Welche Stadt magst du beim Touren am liebsten?",
  "Hast du einen Geheimtipp für Stimme/Gesundheit unterwegs?",
  "Welches Lied singst du privat am liebsten?",
  "Wie war der Einstieg in die Musik für dich?",
  "Gibt es etwas, das Fans oft falsch verstehen?",
  "Was wünschst du dir vom Fanclub für 2026?",
  "Machst du lieber Studio oder Bühne?",
  "Welches Cover würdest du gerne noch aufnehmen?",
  "Wie entspannst du nach einem langen Show-Tag?",
  "Darf man nach der Show noch Hallo sagen am Merch-Stand?",
];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
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

async function ensureBots() {
  const users = await listAllAuthUsers();
  const byEmail = new Map(
    users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]),
  );
  const out: Array<{ id: string; email: string; first: string; last: string }> = [];

  for (const bot of BOTS) {
    let user = byEmail.get(bot.email.toLowerCase());
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: bot.email,
        password: BOT_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: bot.first, last_name: bot.last },
      });
      if (error) {
        // ggf. schon angelegt, aber nicht in erster Liste
        const again = await listAllAuthUsers();
        user = again.find((u) => u.email?.toLowerCase() === bot.email.toLowerCase());
        if (!user) throw new Error(`createUser ${bot.email}: ${error.message}`);
      } else {
        user = data.user!;
      }
    }
    const id = user.id;
    const username = `livesim_${bot.email.split("@")[0]!.replace(/\W/g, "_")}`;
    const { error: pErr } = await admin.from("profiles").upsert(
      {
        id,
        email: bot.email,
        first_name: bot.first,
        last_name: bot.last,
        username,
        role: "member",
        gender: "d",
      },
      { onConflict: "id" },
    );
    if (pErr) throw new Error(`profile ${bot.email}: ${pErr.message}`);

    const { data: mem } = await admin
      .from("memberships")
      .select("id,status")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!mem) {
      const year = new Date().getFullYear();
      await admin.from("memberships").insert({
        user_id: id,
        status: "active",
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        fee_cents: 0,
      });
    } else if (mem.status !== "active") {
      await admin.from("memberships").update({ status: "active" }).eq("id", mem.id);
    }

    out.push({ id, email: bot.email, first: bot.first, last: bot.last });
  }
  return out;
}

async function createSession() {
  const token = randomBytes(32).toString("base64url");
  const id = crypto.randomUUID();
  const now = Date.now();
  const slug = `live-test-${randomBytes(3).toString("hex")}`;
  const row = {
    id,
    slug,
    title: "Live-Test mit Anni (Simulation)",
    join_opens_at: new Date(now - 5 * 60_000).toISOString(),
    starts_at: new Date(now).toISOString(),
    ends_at: new Date(now + (MINUTES + 20) * 60_000).toISOString(),
    status: "live",
    host_token_hash: hashToken(token),
    livekit_room_name: `anni-live-${id.replace(/-/g, "").slice(0, 16)}`,
    created_by: null,
  };
  const { error } = await admin.from("live_sessions").insert(row);
  if (error) throw new Error(error.message);
  return {
    ...row,
    hostUrl: `${BASE}/live/host/${encodeURIComponent(token)}`,
    memberUrl: `${BASE}/live/${slug}`,
    token,
  };
}

async function mailHostLink(hostUrl: string, memberUrl: string) {
  const subject = "Dein Host-Link: Live-Test mit Anni";
  const text = [
    "Hallo Anni (Test),",
    "",
    "hier ist dein Host-Link für die Live-Session. Einfach öffnen und Kamera/Mikro freigeben:",
    hostUrl,
    "",
    "Mitglieder-Ansicht (zum Mitlesen im zweiten Fenster):",
    memberUrl,
    "",
    `Die Simulation läuft ca. ${MINUTES} Minuten mit 8 Test-Mitgliedern (Chat + Fragen).`,
    "",
    "Viele Grüße",
    "Fanclub-Portal Test",
  ].join("\n");
  const html = `<p>Hallo Anni (Test),</p>
<p>hier ist dein <strong>Host-Link</strong> — öffnen und Kamera/Mikro freigeben:</p>
<p><a href="${hostUrl}">${hostUrl}</a></p>
<p>Mitglieder-Ansicht: <a href="${memberUrl}">${memberUrl}</a></p>
<p>Die Simulation läuft ca. ${MINUTES} Minuten mit 8 Test-Mitgliedern (Chat + Fragen).</p>`;

  const result = await sendEmailViaAccount({ to: TO, subject, text, html });
  if (!result.ok) {
    console.warn(
      "E-Mail fehlgeschlagen:",
      "error" in result ? result.error : "skipped",
      "— Host-Link steht unten in der Konsole.",
    );
    return false;
  }
  console.log(`✓ Host-Link per Mail an ${TO}`);
  return true;
}

async function main() {
  console.log("=== Live-Session Simulation ===");
  console.log(`Dauer ≈ ${MINUTES} Min · Mail an ${TO}`);

  const bots = await ensureBots();
  for (const bot of bots) {
    console.log(`  Bot bereit: ${bot.first} ${bot.last}`);
  }

  const session = await createSession();
  console.log(`✓ Session live: ${session.slug}`);
  console.log(`  Host:     ${session.hostUrl}`);
  console.log(`  Mitglieder: ${session.memberUrl}`);

  await mailHostLink(session.hostUrl, session.memberUrl);

  // Sofort etwas Chat-History
  for (let i = 0; i < 10; i++) {
    const bot = pick(bots);
    await admin.from("live_session_messages").insert({
      session_id: session.id,
      author_id: bot.id,
      body: pick(CHAT_LINES),
    });
    await sleep(120);
  }
  for (let i = 0; i < 4; i++) {
    const bot = pick(bots);
    await admin.from("live_session_questions").insert({
      session_id: session.id,
      author_id: bot.id,
      body: pick(QUESTIONS),
    });
    await sleep(80);
  }
  console.log("✓ Start-Chat + erste Fragen sind drin — jetzt Host-Link öffnen!");

  const endAt = Date.now() + MINUTES * 60_000;
  let nChat = 0;
  let nQ = 0;
  while (Date.now() < endAt) {
    const bot = pick(bots);
    if (Math.random() < 0.55) {
      await admin.from("live_session_messages").insert({
        session_id: session.id,
        author_id: bot.id,
        body: pick(CHAT_LINES),
      });
      nChat += 1;
    } else {
      await admin.from("live_session_questions").insert({
        session_id: session.id,
        author_id: bot.id,
        body: pick(QUESTIONS),
      });
      nQ += 1;
    }
    const wait = 4000 + Math.floor(Math.random() * 9000);
    const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    process.stdout.write(`\r  sim: ${nChat} Chats, ${nQ} Fragen · noch ~${left}s   `);
    await sleep(wait);
  }
  console.log("\n✓ Simulation beendet.");
  console.log("Session kannst du unter Admin → Live mit Anni beenden.");
  console.log(session.hostUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
