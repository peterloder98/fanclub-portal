/**
 * Wendet supabase/143_profiles_is_hidden.sql an.
 * Benötigt SUPABASE_DB_PASSWORD in .env.local.
 *
 *   node --env-file=.env.local scripts/apply-profiles-is-hidden.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sqlPath = join(root, "supabase/143_profiles_is_hidden.sql");

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

async function verify() {
  const admin = createClient(url, serviceKey);
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,role,is_hidden")
    .eq("id", "1b70d88f-e28d-48f3-b3cb-646eaf06f19a")
    .maybeSingle();
  if (error) {
    console.error("[verify]", error.message);
    return false;
  }
  console.log("[verify]", data);
  return Boolean(data?.is_hidden);
}

const sql = readFileSync(sqlPath, "utf8");
const ok = await runWithPg(sql);
if (!ok) process.exit(1);
const flagged = await verify();
if (!flagged) {
  console.error("Peter ist nach Migration nicht is_hidden=true.");
  process.exit(1);
}
console.log("✓ Peter Loder ist is_hidden");
