import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const peter = {
  email: "mail@peter-loder.de",
  first_name: "Peter",
  last_name: "Loder",
  birthdate: "1984-06-24",
  role: "admin",
  username: "peter.loder",
};

async function findUserIdByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

let userId = await findUserIdByEmail(peter.email);

if (!userId) {
  console.log("Creating auth user for Peter…");
  const tempPassword = crypto.randomUUID();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: peter.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role: peter.role,
      username: peter.username,
      first_name: peter.first_name,
      last_name: peter.last_name,
    },
  });
  if (error) {
    console.error("Auth create error:", error.message);
    process.exit(1);
  }
  userId = created.user.id;

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink(
    {
      type: "recovery",
      email: peter.email,
      options: {
        redirectTo: "http://localhost:3000/auth/callback?next=/reset-password",
      },
    },
  );
  if (linkErr) {
    console.error("Generate link error:", linkErr.message);
  } else {
    console.log("Set-password link (recovery):", linkData.properties.action_link);
  }
} else {
  console.log("Auth user already exists:", userId);
}

console.log("Upserting profile role=admin…");
const { data: profile, error: profileErr } = await admin
  .from("profiles")
  .upsert(
    {
      id: userId,
      email: peter.email,
      role: "admin",
      username: peter.username,
      first_name: peter.first_name,
      last_name: peter.last_name,
      birthdate: peter.birthdate,
    },
    { onConflict: "id" },
  )
  .select("id,email,role,first_name,last_name")
  .maybeSingle();

if (profileErr) {
  console.error("Profile upsert error:", profileErr.message);
  process.exit(1);
}

console.log("OK:", profile);

