/**
 * Wendet ausstehende SQL-Migrationen an (supabase/*.sql ab 058).
 * Benötigt SUPABASE_DB_PASSWORD in .env.local (Datenbank-Passwort aus Supabase Dashboard).
 *
 *   node --env-file=.env.local scripts/apply-sql-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const supabaseDir = join(root, "supabase");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY erforderlich.");
  process.exit(1);
}

const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("Konnte Projekt-Ref aus SUPABASE_URL nicht lesen.");
  process.exit(1);
}

const MIGRATION_FILES = [
  "058_member_warnings_self_select.sql",
  "059_user_notifications.sql",
  "060_membership_approved_template.sql",
  "061_email_send_log.sql",
  "062_ledger_perf_indexes.sql",
];

async function runWithPg(sql, label) {
  if (!dbPassword) {
    console.warn(`[skip pg] ${label}: SUPABASE_DB_PASSWORD fehlt in .env.local`);
    return false;
  }
  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.warn(`[skip pg] ${label}: npm install pg (oder Migration manuell im SQL Editor)`);
    return false;
  }
  const hosts = [
    `aws-0-eu-central-1.pooler.supabase.com`,
    `db.${projectRef}.supabase.co`,
  ];
  for (const host of hosts) {
    const port = host.includes("pooler") ? 6543 : 5432;
    const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@${host}:${port}/postgres`;
    const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log(`[ok] ${label} (${host})`);
      return true;
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      console.warn(`[pg fail ${host}] ${label}:`, e.message);
    }
  }
  return false;
}

async function upsertEmailTemplate() {
  const admin = createClient(url, serviceKey);
  const bodyText = [
    "Liebe/r {{first_name}},",
    "",
    "Es freut uns dir heute Bescheid geben zu können, dass wir deinen Mitgliedsantrag freigeben konnten und begrüßen dich ganz herzlich im Anni Perka Fanclub.",
    "",
    "Deine Mitgliedsnummer: {{membership_number}}",
    "",
    "Bitte vervollständige auch direkt deine Anmeldung zur Fanclub App — ein Klick, dein Passwort festlegen und du hast Zugang zu allen aktuellen Diskussionen, Umfragen, Gewinnspielen und einer ausführlichen Eventliste von Anni.",
    "",
    "Hier die Registrierung abschließen:",
    "{{invite_url}}",
    "",
    "Umgehend werden wir dich auch in die WhatsApp-Gruppe aufnehmen.",
    "",
    "{{admin_signature_text}}",
  ].join("\n");
  const { error } = await admin.from("email_templates").upsert(
    {
      key: "membership_approved_welcome",
      name: "Mitgliedschaft freigegeben (an neues Mitglied)",
      description:
        "Wird nach Freigabe des Antrags versendet — enthält Mitgliedsnummer und Link zur Passwortvergabe.",
      subject: "Annahme deines Mitgliedsantrages",
      body_text: bodyText,
      body_html: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) console.warn("[template upsert]", error.message);
  else console.log("[ok] email_templates.membership_approved_welcome (API)");
}

async function checkNotificationsTable() {
  const admin = createClient(url, serviceKey);
  const { error } = await admin.from("user_notifications").select("id").limit(1);
  if (error && /does not exist/i.test(error.message)) return false;
  return !error;
}

async function main() {
  console.log("Prüfe Migrationen für Projekt", projectRef);

  for (const file of MIGRATION_FILES) {
    const path = join(supabaseDir, file);
    const sql = readFileSync(path, "utf8");
    if (file === "060_membership_approved_template.sql") {
      await upsertEmailTemplate();
      continue;
    }
    const ok = await runWithPg(sql, file);
    if (!ok && file === "059_user_notifications.sql") {
      const exists = await checkNotificationsTable();
      if (exists) console.log(`[ok] ${file} (bereits vorhanden)`);
    }
  }

  const notifOk = await checkNotificationsTable();
  console.log(notifOk ? "✓ user_notifications bereit" : "✗ user_notifications fehlt — SQL 059 ausführen");

  const admin = createClient(url, serviceKey);
  const { data: tpl } = await admin
    .from("email_templates")
    .select("key")
    .eq("key", "membership_approved_welcome")
    .maybeSingle();
  console.log(tpl ? "✓ Freigabe-E-Mail-Vorlage bereit" : "✗ Freigabe-Vorlage fehlt");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
