/**
 * Test-Quiz-Gewinnspiel: 16 Teilnehmer (5 berechtigt), 2 Preise.
 *
 * node --env-file=.env.local scripts/seed-giveaway-porsche-thermomix.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const GIVEAWAY_TITLE = "Test: Porsche Cayenne & Thermomix";
const TOTAL_PARTICIPANTS = 16;
const ELIGIBLE_COUNT = 5;

function endsAtTodayBerlin945() {
  const now = new Date();
  const ymd = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const at945 = new Date(`${ymd}T09:45:00+02:00`);
  const at2145 = new Date(`${ymd}T21:45:00+02:00`);

  if (at945.getTime() > now.getTime()) return { iso: at945.toISOString(), label: "09:45 Uhr" };
  if (at2145.getTime() > now.getTime()) return { iso: at2145.toISOString(), label: "21:45 Uhr" };
  return { iso: at945.toISOString(), label: "09:45 Uhr (beendet)" };
}

async function getAdminId() {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.id) throw new Error("Kein Admin-Profil gefunden.");
  return data.id;
}

async function pickParticipantIds(limit) {
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id, profiles!inner(role,membership_number,last_name,first_name)")
    .eq("status", "active")
    .order("profiles(membership_number)", { ascending: true, nullsFirst: false });

  const ids = [];
  for (const m of memberships ?? []) {
    if (m.profiles?.role === "admin") continue;
    if (!ids.includes(m.user_id)) ids.push(m.user_id);
    if (ids.length >= limit) break;
  }

  if (ids.length < limit) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "member")
      .order("last_name");
    for (const p of profiles ?? []) {
      if (!ids.includes(p.id)) ids.push(p.id);
      if (ids.length >= limit) break;
    }
  }

  return ids.slice(0, limit);
}

async function removeExistingGiveaway() {
  const { data } = await admin
    .from("giveaways")
    .select("id")
    .eq("title", GIVEAWAY_TITLE)
    .maybeSingle();
  if (!data?.id) return;
  const { error } = await admin.from("giveaways").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  console.log("Vorheriges Test-Gewinnspiel entfernt.");
}

async function main() {
  const adminId = await getAdminId();
  await removeExistingGiveaway();

  const { iso: endsAt, label: endsLabel } = endsAtTodayBerlin945();
  // Testdaten mit vorgefüllten Teilnahmen → direkt auslosbar
  const status = "ended";

  const { data: giveaway, error: gErr } = await admin
    .from("giveaways")
    .insert({
      author_id: adminId,
      title: GIVEAWAY_TITLE,
      description:
        "Beantworte die Quiz-Frage richtig, um an der Auslosung teilzunehmen. Es warten ein Traum-SUV und ein Thermomix auf euch!",
      entry_mode: "quiz",
      ends_at: endsAt,
      status,
      is_active: true,
      is_paused: false,
    })
    .select("id")
    .single();
  if (gErr) throw new Error(gErr.message);

  const giveawayId = giveaway.id;

  const { error: pErr } = await admin.from("giveaway_prizes").insert([
    { giveaway_id: giveawayId, name: "1. Preis: Porsche Cayenne", sort_order: 0 },
    { giveaway_id: giveawayId, name: "2. Preis: Thermomix", sort_order: 1 },
  ]);
  if (pErr) throw new Error(pErr.message);

  const { data: question, error: qErr } = await admin
    .from("giveaway_questions")
    .insert({
      giveaway_id: giveawayId,
      question_text: "Wie heißt der offizielle Fanclub von Anni Perka?",
      sort_order: 0,
    })
    .select("id")
    .single();
  if (qErr) throw new Error(qErr.message);

  const optionRows = [
    { question_id: question.id, label: "Anni Perka Fanclub", is_correct: true },
    { question_id: question.id, label: "Anni Superfans United", is_correct: false },
    { question_id: question.id, label: "Perka Liebhaber e.V.", is_correct: false },
  ].map((row, i) => ({ ...row, sort_order: i }));

  let options;
  let oErr;
  ({ data: options, error: oErr } = await admin
    .from("giveaway_question_options")
    .insert(optionRows)
    .select("id,label,is_correct"));

  if (oErr && /sort_order/i.test(oErr.message)) {
    ({ data: options, error: oErr } = await admin
      .from("giveaway_question_options")
      .insert(
        optionRows.map(({ question_id, label, is_correct }) => ({
          question_id,
          label,
          is_correct,
        })),
      )
      .select("id,label,is_correct"));
  }
  if (oErr) throw new Error(oErr.message);

  const correctOption = options.find((o) => o.is_correct);
  const wrongOptions = options.filter((o) => !o.is_correct);
  if (!correctOption || wrongOptions.length < 2) {
    throw new Error("Quiz-Optionen unvollständig.");
  }

  const userIds = await pickParticipantIds(TOTAL_PARTICIPANTS);
  if (userIds.length < TOTAL_PARTICIPANTS) {
    throw new Error(`Nur ${userIds.length} Mitglieder gefunden, ${TOTAL_PARTICIPANTS} benötigt.`);
  }

  let eligible = 0;
  let total = 0;

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const isEligible = i < ELIGIBLE_COUNT;
    const chosen = isEligible
      ? correctOption
      : wrongOptions[i % wrongOptions.length];

    const { data: entry, error: eErr } = await admin
      .from("giveaway_entries")
      .insert({
        giveaway_id: giveawayId,
        user_id: userId,
        is_eligible: isEligible,
      })
      .select("id")
      .single();
    if (eErr) throw new Error(eErr.message);

    const { error: aErr } = await admin.from("giveaway_entry_answers").insert({
      entry_id: entry.id,
      question_id: question.id,
      option_id: chosen.id,
    });
    if (aErr) throw new Error(aErr.message);

    total += 1;
    if (isEligible) eligible += 1;

    const { data: prof } = await admin
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", userId)
      .maybeSingle();
    const name = `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim() || userId.slice(0, 8);
    console.log(
      `  ${isEligible ? "✓" : "✗"} ${name} → ${chosen.label}${isEligible ? " (berechtigt)" : ""}`,
    );
  }

  console.log("\n---");
  console.log(`Gewinnspiel: ${GIVEAWAY_TITLE}`);
  console.log(`ID: ${giveawayId}`);
  console.log(`Ende: heute ${endsLabel} (${endsAt})`);
  console.log(`Status: ${status}`);
  console.log(`Teilnahmen: ${total} gesamt · ${eligible} berechtigt`);
  console.log(`Preise: Porsche Cayenne, Thermomix`);
  console.log(`Link: /giveaways/${giveawayId}`);
  console.log("\nFertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
