/**
 * Setzt die drei Vorstände auf role=admin.
 *   npx --yes tsx --env-file=.env.local scripts/set-board-admins.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const BOARD = [
  { first_name: "Nicole", last_name: "Ness" },
  { first_name: "Andreas", last_name: "Seidel" },
  { first_name: "Janine", last_name: "Kieczka" },
] as const;

async function main() {
  for (const m of BOARD) {
    const { data, error } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .ilike("first_name", m.first_name)
      .ilike("last_name", m.last_name)
      .select("id,email,first_name,last_name,role")
      .maybeSingle();

    if (error) {
      console.error(`${m.first_name} ${m.last_name}:`, error.message);
      continue;
    }
    if (!data) {
      console.error(`${m.first_name} ${m.last_name}: nicht gefunden`);
      continue;
    }
    console.log(`✓ ${data.first_name} ${data.last_name} <${data.email}> → ${data.role}`);
  }
  console.log("Fertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
