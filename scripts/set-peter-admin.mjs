import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabaseAdmin = createClient(url, serviceRoleKey);

const PETER_EMAIL = "mail@peter-loder.de";

const { data, error } = await supabaseAdmin
  .from("profiles")
  .update({ role: "admin" })
  .eq("email", PETER_EMAIL)
  .select("id,email,role,first_name,last_name")
  .maybeSingle();

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

if (!data) {
  console.error(
    `No profile row found for ${PETER_EMAIL}. Create the auth user + profile first.`,
  );
  process.exit(1);
}

console.log("OK:", data);

