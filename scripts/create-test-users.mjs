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

const PASSWORD = "Test!23456";

const users = [
  {
    email: "max.wagner.test@peter-loder.de",
    profile: {
      role: "member",
      username: "max.wagner",
      first_name: "Max",
      last_name: "Wagner",
      birthdate: "1991-03-14",
      gender: "m",
      street: "Blumenstraße 12",
      postal_code: "80331",
      city: "München",
      country: "DE",
      phone: "+49 170 1234567",
    },
    membership: {
      start_date: "2026-01-15",
      end_date: "2027-01-15",
      fee_cents: 2500,
      status: "active",
    },
  },
  {
    email: "lena.hoffmann.test@peter-loder.de",
    profile: {
      role: "member",
      username: "lena.hoffmann",
      first_name: "Lena",
      last_name: "Hoffmann",
      birthdate: "1994-11-02",
      gender: "w",
      street: "Rosenweg 7",
      postal_code: "20095",
      city: "Hamburg",
      country: "DE",
      phone: "+49 160 2345678",
    },
    membership: {
      start_date: "2026-02-01",
      end_date: "2027-02-01",
      fee_cents: 2500,
      status: "active",
    },
  },
  {
    email: "jonas.becker.test@peter-loder.de",
    profile: {
      role: "member",
      username: "jonas.becker",
      first_name: "Jonas",
      last_name: "Becker",
      birthdate: "1988-07-25",
      gender: "m",
      street: "Parkallee 19",
      postal_code: "60311",
      city: "Frankfurt am Main",
      country: "DE",
      phone: "+49 151 3456789",
    },
    membership: {
      start_date: "2025-12-01",
      end_date: "2026-12-01",
      fee_cents: 2500,
      status: "inactive",
    },
  },
  {
    email: "sophie.neumann.test@peter-loder.de",
    profile: {
      role: "member",
      username: "sophie.neumann",
      first_name: "Sophie",
      last_name: "Neumann",
      birthdate: "1997-05-09",
      gender: "w",
      street: "Seestraße 3",
      postal_code: "70173",
      city: "Stuttgart",
      country: "DE",
      phone: "+49 171 4567890",
    },
    membership: {
      start_date: "2026-03-10",
      end_date: "2027-03-10",
      fee_cents: 3500,
      status: "active",
    },
  },
  {
    email: "david.schulz.test@peter-loder.de",
    profile: {
      role: "member",
      username: "david.schulz",
      first_name: "David",
      last_name: "Schulz",
      birthdate: "1990-09-18",
      gender: "m",
      street: "Hauptstraße 55",
      postal_code: "04109",
      city: "Leipzig",
      country: "DE",
      phone: "+49 159 5678901",
    },
    membership: {
      start_date: "2026-04-01",
      end_date: "2027-04-01",
      fee_cents: 2500,
      status: "active",
    },
  },
];

async function findUserIdByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

for (const u of users) {
  console.log(`\n==> Creating auth user: ${u.email}`);
  let userId = null;

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        role: u.profile.role,
        username: u.profile.username,
        first_name: u.profile.first_name,
        last_name: u.profile.last_name,
      },
    });

  if (createError) {
    console.warn("Auth create warning:", createError.message);
    userId = await findUserIdByEmail(u.email);
    if (!userId) {
      console.error("Could not find existing auth user by email.");
      continue;
    }
  } else {
    userId = created.user.id;
  }

  console.log("Auth user id:", userId);

  // Insert profile
  const profileRow = {
    id: userId,
    email: u.email,
    ...u.profile,
  };
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });
  if (profileError) {
    console.error("Profile upsert error:", profileError.message);
    continue;
  }

  // Insert membership
  const membershipRow = {
    user_id: userId,
    ...u.membership,
  };
  const { error: membershipError } = await supabaseAdmin
    .from("memberships")
    .upsert(membershipRow, { onConflict: "user_id,start_date" });
  if (membershipError) {
    console.error("Membership insert error:", membershipError.message);
    continue;
  }

  console.log("OK");
}

console.log("\nDone. Password for all users:", PASSWORD);

