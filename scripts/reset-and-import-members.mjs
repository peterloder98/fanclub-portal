/**
 * Reset Test-Daten + Import echter Mitglieder aus Excel (ohne E-Mail → Platzhalter).
 * Aktualisiert außerdem die Vereins-Kontodaten in payment_settings.
 *
 *   node --env-file=.env.local scripts/reset-and-import-members.mjs
 *   node --env-file=.env.local scripts/reset-and-import-members.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { geocodeProfileAddress, sleep } from "./lib/geocode-profile.mjs";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const excelPath = join(root, "data/mitgliedsliste-2026-07-26.xlsx");
const dryRun = process.argv.includes("--dry-run");

const CLUB_BANK = {
  account_holder: "Anni-Perka Fanclub",
  iban: "DE42 1305 0000 0201 1955 42",
  bic: "NOLADE21ROS",
  bank_name: "Ostseesparkasse Rostock",
};

const FEMALE = new Set(
  "anna,maria,elena,clara,greta,ida,sophie,lisa,laura,julia,sarah,lena,hannah,lea,emily,emilia,mia,lina,nina,paula,marie,katharina,nicole,jessica,janine,jenni,petra,andrea,christina,stefanie,melanie,sandra,barbara,heike,birgit,angelika,karin,martina,silke,anke,franziska,theresa,luise,charlotte,magdalena,judith,emma,mila,ella,nora,alina,vanessa,johanna,antonia,victoria,alexandra,daniela,gabriele,manuela,sonja,tanja,yvonne,annika,astrid,carla,celina,chiara,denise,diana,elke,erika,eva,finja,ines,inga,iris,isabel,jana,jasmin,jennifer,karen,katja,katrin,kim,klara,larissa,leonie,linda,lore,madeleine,maike,marina,marion,marlene,meike,michaela,miriam,nadine,natalie,nele,nicola,olivia,patricia,pia,rebecca,regina,rita,ronja,sabrina,saskia,selina,sina,svenja,tamara,tina,ulrike,valentina,vera,verena,veronika,wendy,wilma,heidi,gudrun,brigitte,christine,dorothea,edith,ilse,ingeborg,jutta,renate,rosemarie,susanne,ute,waltraud,anja,bianca,carina,claudia,cornelia,elisa,elisabeth,ellen,fabienne,frauke,freya,frida,gisela,hanna,helen,helena,helene,ida,ilona,ingrid,irene,isabella,jacqueline,jenny,josefine,julia,juliane,julie,karina,kathrin,kira,kirsten,kristin,kristina,lara,lea,lena,lia,lilli,lilly,lisa,liv,loreen,lotte,louisa,louise,lucia,lucy,luisa,maja,mandy,mara,mareike,mari,marianne,marie,marika,marita,marleen,marta,martha,mathilde,maya,melissa,merle,mia,michelle,milena,mina,mira,mona,monika,nadja,nancy,natascha,nina,nora,olga,paula,pauline,petra,pia,ramona,ricarda,romana,rosa,rosalie,ruth,sabine,sara,sarah,sibylle,silvia,simone,sofia,sophia,sophie,stephanie,sylvia,tatjana,theresa,ursula,viktoria,viola,wiebke,loreen,janine,nicole,lena,mia"
    .split(","),
);
const MALE = new Set(
  "peter,andreas,jan,max,paul,leon,ben,felix,lukas,jonas,tim,tom,noah,emil,finn,luis,luca,julian,david,alexander,michael,thomas,stefan,markus,christian,daniel,martin,sebastian,tobias,florian,patrick,dennis,kevin,marcel,marco,mario,matthias,andre,frank,klaus,hans,heinz,wolfgang,dieter,horst,gerhard,helmut,werner,uwe,ralf,rainer,bernd,jens,olaf,sven,torsten,lars,nils,dirk,ingo,kai,karsten,lutz,manfred,norbert,otto,philipp,rafael,robert,roland,rudolf,sascha,thorsten,timo,udo,ulf,ulrich,volker,wilhelm,willi,axel,bruno,carl,christoph,clemens,detlef,dietmar,dominik,edgar,eduard,elias,erik,ernst,erwin,eugen,fabian,falk,ferdinand,franz,fred,friedrich,fritz,georg,gerald,gerd,gregor,gunnar,gustav,hagen,harald,hartmut,heiko,hendrik,henning,henrik,henry,herbert,hermann,holger,hugo,jacob,jakob,jannik,jasper,joachim,jochen,johann,johannes,jonathan,josef,joseph,julius,karl,kilian,konrad,kurt,leif,lennart,leo,leonard,linus,lorenz,lothar,lucas,ludwig,magnus,maik,malte,manuel,marc,marius,mark,marko,marlon,marvin,mathias,matteo,maximilian,moritz,nico,nicolas,niklas,oliver,oskar,pascal,peer,raphael,reiner,reinhard,rene,richard,rico,robin,roger,roman,ronny,samuel,sandro,sean,sergej,silas,simon,steffen,theo,theodor,thilo,til,tino,tom,tommy,tony,torben,urs,veit,victor,viktor,vincent,walter,werner,winfried,wolf,wolfgang,yannick,andreas,seidel"
    .split(","),
);

function inferGender(firstName) {
  const key = String(firstName ?? "")
    .trim()
    .toLowerCase()
    .split(/[\s-]+/)[0];
  if (FEMALE.has(key)) return "w";
  if (MALE.has(key)) return "m";
  return "d";
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);
const KEEP_EMAILS = new Set(["mail@peter-loder.de"]);

function excelDate(n) {
  if (n == null || n === "") return null;
  if (typeof n === "string") {
    const s = n.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  }
  const d = XLSX.SSF.parse_date_code(n);
  if (!d) return null;
  return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
}

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

function placeholderEmail(nr) {
  return `mitglied-${nr}@noemail.fanclub-import.invalid`;
}

function parseMembers() {
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const members = [];
  for (let i = 3; i < raw.length; i++) {
    const r = raw[i];
    if (!r?.[1]) continue;
    const name = String(r[1]).trim();
    if (/name,\s*vorname/i.test(name)) continue;
    const [last, ...rest] = name.split(",").map((s) => s.trim());
    const first = rest.join(" ").trim();
    if (!last || !first) continue;
    const nr = String(r[0]).trim();
    const start = excelDate(r[5]) ?? "2026-03-08";
    const payment = excelDate(r[6]);
    const statusRaw = String(r[7] ?? "aktiv").trim().toLowerCase();
    const status = statusRaw === "aktiv" ? "active" : "inactive";
    const ortRaw = r[4] != null ? String(r[4]).trim() : "";
    const { city, country } = (() => {
      const split = ortRaw.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      if (!split) return { city: ortRaw || null, country: "DE" };
      const suffix = split[2].trim().toUpperCase();
      if (/SCHWEIZ|SUISSE|SWITZERLAND/.test(suffix)) return { city: split[1].trim(), country: "CH" };
      if (/NIEDER|HOLLAND|NETHERLANDS/.test(suffix)) return { city: split[1].trim(), country: "NL" };
      if (/ÖSTERREICH|OESTERREICH|AUSTRIA/.test(suffix)) return { city: split[1].trim(), country: "AT" };
      if (/DEUTSCHLAND|GERMANY/.test(suffix)) return { city: split[1].trim(), country: "DE" };
      return { city: ortRaw || null, country: "DE" };
    })();
    members.push({
      membership_number: nr,
      first_name: first,
      last_name: last,
      street: r[2] != null ? String(r[2]).trim() : null,
      postal_code: r[3] != null ? String(r[3]).trim() : null,
      city,
      country,
      start_date: start,
      end_date: addYear(start),
      payment_date: payment,
      status,
      phone: r[9] != null ? String(r[9]).trim() : null,
      birthdate: excelDate(r[10]),
      gender: inferGender(first),
      email: placeholderEmail(nr),
    });
  }
  return members;
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

async function wipeTable(table) {
  if (dryRun) {
    console.log(`[dry] wipe ${table}`);
    return;
  }
  const { error } = await admin.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z");
  if (error) {
    const { error: e2 } = await admin.from(table).delete().not("id", "is", null);
    if (e2) console.warn(`  ${table}: ${error.message}`);
    else console.log(`geleert: ${table}`);
  } else {
    console.log(`geleert: ${table}`);
  }
}

async function wipeCommunityContent() {
  for (const t of [
    "giveaway_winners",
    "giveaway_entries",
    "giveaways",
    "poll_votes",
    "poll_options",
    "polls",
    "post_likes",
    "post_comments",
    "post_media",
    "posts",
    "points_transactions",
    "voting_clicks",
    "event_participations",
    "user_notifications",
    "member_activity_log",
    "member_warnings",
    "membership_applications",
    "radio_voting_participations",
  ]) {
    await wipeTable(t);
  }
}

async function deleteNonKeepUsers() {
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,role");
  const authUsers = await listAllAuthUsers();
  const authById = new Map(authUsers.map((u) => [u.id, u]));

  let deleted = 0;
  for (const p of profiles ?? []) {
    const email = (p.email ?? authById.get(p.id)?.email ?? "").toLowerCase();
    const keep =
      KEEP_EMAILS.has(email) ||
      (p.first_name === "Peter" &&
        p.last_name === "Loder" &&
        /peter-loder|mail@peter/i.test(email));
    if (keep) {
      console.log(`behalte Admin: ${p.first_name} ${p.last_name} <${email}>`);
      continue;
    }
    console.log(`${dryRun ? "[dry] " : ""}lösche: ${p.first_name} ${p.last_name} <${email}>`);
    if (!dryRun) {
      const { error } = await admin.auth.admin.deleteUser(p.id);
      if (error) console.warn(`  Fehler: ${error.message}`);
      else deleted += 1;
    } else deleted += 1;
  }
  console.log(`gelöscht: ${deleted}`);
}

async function updateBankSettings() {
  console.log("Bankdaten →", CLUB_BANK);
  if (dryRun) return;
  const { error } = await admin
    .from("payment_settings")
    .update({
      public_config_json: CLUB_BANK,
      is_enabled: true,
      is_test_mode: false,
    })
    .eq("provider", "bank_transfer");
  if (error) throw new Error(error.message);
}

async function uniqueUsername(first, last) {
  const base = baseUsername(first, last);
  for (let i = 0; i < 80; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}.${Date.now()}`;
}

async function importMembers(members) {
  let ok = 0;
  for (const m of members) {
    const username = await uniqueUsername(m.first_name, m.last_name);
    console.log(
      `${dryRun ? "[dry] " : ""}#${m.membership_number} ${m.last_name}, ${m.first_name} → ${username}`,
    );
    if (dryRun) {
      ok += 1;
      continue;
    }

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
        email_pending: true,
      },
    });
    if (createErr) {
      console.warn(`  Auth-Fehler #${m.membership_number}: ${createErr.message}`);
      continue;
    }

    const userId = created.user.id;
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: "member",
        username,
        membership_number: m.membership_number,
        email: null,
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
    if (profileErr) {
      console.warn(`  Profil-Fehler: ${profileErr.message}`);
      await admin.auth.admin.deleteUser(userId);
      continue;
    }

    const { error: memErr } = await admin.from("memberships").insert({
      user_id: userId,
      start_date: m.start_date,
      end_date: m.end_date,
      fee_cents: 1500,
      status: m.status,
    });
    if (memErr) console.warn(`  Membership-Fehler: ${memErr.message}`);

    const coords = await geocodeProfileAddress({
      street: m.street,
      postal_code: m.postal_code,
      city: m.city,
      country: m.country,
    });
    await sleep(1100);
    if (coords) {
      await admin
        .from("profiles")
        .update({ map_lat: coords.lat, map_lng: coords.lng })
        .eq("id", userId);
    } else {
      console.warn(`  Keine Geo-Koordinaten für #${m.membership_number}`);
    }

    await admin.from("points_transactions").delete().eq("user_id", userId);
    ok += 1;
  }
  console.log(`importiert: ${ok}/${members.length}`);
}

async function resetPeterPoints() {
  if (dryRun) return;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "mail@peter-loder.de")
    .maybeSingle();
  if (!data) return;
  await admin.from("points_transactions").delete().eq("user_id", data.id);
  await admin.from("profiles").update({ warning_count: 0 }).eq("id", data.id);
  console.log("Peter Warnings zurückgesetzt, Punkte-Transaktionen geleert");
}

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== LIVE IMPORT ===");
  readFileSync(excelPath);
  const members = parseMembers();
  console.log(`Excel: ${members.length} Mitglieder`);
  if (!members.length) throw new Error("Keine Mitglieder in Excel gefunden");

  await updateBankSettings();
  await wipeCommunityContent();
  await deleteNonKeepUsers();
  await importMembers(members);
  await resetPeterPoints();
  console.log("fertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
