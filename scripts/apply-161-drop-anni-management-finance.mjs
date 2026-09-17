/**
 * Wendet supabase/161_drop_anni_management_finance.sql an.
 *
 *   node --env-file=.env.local scripts/apply-161-drop-anni-management-finance.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sqlPath = join(root, "supabase/161_drop_anni_management_finance.sql");

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

async function runWithPg(sql) {
  if (!dbPassword) {
    console.error("SUPABASE_DB_PASSWORD fehlt in .env.local — SQL manuell im Dashboard ausführen.");
    return false;
  }
  const pg = await import("pg");
  const hosts = [
    `aws-1-eu-central-2.pooler.supabase.com`,
    `aws-0-eu-central-1.pooler.supabase.com`,
    `db.${projectRef}.supabase.co`,
  ];
  for (const host of hosts) {
    const port = host.includes("pooler") ? 6543 : 5432;
    const user = host.includes("pooler") ? `postgres.${projectRef}` : "postgres";
    const connectionString = `postgresql://${user}:${encodeURIComponent(dbPassword)}@${host}:${port}/postgres`;
    const client = new pg.default.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log(`[ok] SQL angewendet (${host})`);
      return true;
    } catch (e) {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
      console.warn(`[pg fail ${host}]`, e.message);
    }
  }
  return false;
}

async function verifyGone() {
  const admin = createClient(url, serviceKey);
  const { error: jobsErr } = await admin.from("anni_mgmt_jobs").select("id").limit(1);
  const jobsGone = Boolean(jobsErr && /does not exist|schema cache/i.test(jobsErr.message));
  const { error: colErr } = await admin.from("profiles").select("id,is_management").limit(1);
  const colGone = Boolean(colErr && /is_management|does not exist|schema cache/i.test(colErr.message));
  if (!jobsGone) {
    console.error("[verify] anni_mgmt_jobs existiert noch", jobsErr?.message ?? "ohne Fehler");
  }
  if (!colGone) {
    console.error("[verify] profiles.is_management existiert noch", colErr?.message ?? "ohne Fehler");
  }
  if (jobsGone && colGone) {
    console.log("[verify] Abrechnungstabellen und is_management entfernt");
    return true;
  }
  return false;
}

const sql = readFileSync(sqlPath, "utf8");
const ok = await runWithPg(sql);
if (!ok) process.exit(1);
const gone = await verifyGone();
if (!gone) process.exit(1);
console.log("✓ Anni-Abrechnung aus der Portal-Datenbank entfernt");
