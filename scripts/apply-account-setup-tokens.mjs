/**
 * Wendet supabase/145_account_setup_tokens.sql an.
 * Benötigt SUPABASE_DB_PASSWORD in .env.local.
 *
 *   node --env-file=.env.local scripts/apply-account-setup-tokens.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sqlPath = join(root, "supabase/145_account_setup_tokens.sql");

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
    "aws-1-eu-central-2.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
    `db.${projectRef}.supabase.co`,
  ];
  for (const host of hosts) {
    const port = host.includes("pooler") ? 6543 : 5432;
    const user = host.includes("pooler") ? `postgres.${projectRef}` : "postgres";
    const connectionString = `postgresql://${user}:${encodeURIComponent(dbPassword)}@${host}:${port}/postgres`;
    const client = new pg.default.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
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
    .from("account_setup_tokens")
    .select("id")
    .limit(1);
  if (error) {
    console.error("[verify]", error.message);
    return false;
  }
  console.log("[verify] account_setup_tokens ready, sample:", data?.[0] ?? null);
  return true;
}

const sql = readFileSync(sqlPath, "utf8");
const ok = await runWithPg(sql);
if (!ok) process.exit(1);
const verified = await verify();
if (!verified) process.exit(1);
console.log("✓ account_setup_tokens verfügbar");
