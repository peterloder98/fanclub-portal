import type { SupabaseClient } from "@supabase/supabase-js";

function baseUsername(first: string, last: string) {
  const slug = `${first}.${last}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");
  return slug || "member";
}

function addYear(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function uniqueUsername(
  admin: SupabaseClient,
  first: string,
  last: string,
) {
  const base = baseUsername(first, last);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!existing) return candidate;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}

export type ApplicantProfileInput = {
  email: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender?: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  country_code?: string | null;
  phone: string;
  membership_start_date?: string | null;
};

/** Creates auth user (unconfirmed) + profile + membership status `applied`. */
export async function provisionMembershipApplicant(
  admin: SupabaseClient,
  input: ApplicantProfileInput,
): Promise<{ userId: string; created: boolean }> {
  const email = input.email.trim().toLowerCase();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    const { data: membership } = await admin
      .from("memberships")
      .select("status")
      .eq("user_id", existingProfile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membership?.status === "applied") {
      await syncApplicantProfile(admin, existingProfile.id, input);
      return { userId: existingProfile.id, created: false };
    }

    throw new Error(
      "Diese E-Mail ist bereits registriert. Bitte melde dich an oder kontaktiere den Fanclub.",
    );
  }

  const username = await uniqueUsername(admin, input.first_name, input.last_name);
  const passwordTemp = crypto.randomUUID();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: passwordTemp,
    email_confirm: false,
    user_metadata: {
      role: "member",
      username,
      first_name: input.first_name,
      last_name: input.last_name,
    },
  });

  if (createErr) {
    if (/already|registered|exists/i.test(createErr.message)) {
      throw new Error(
        "Diese E-Mail ist bereits registriert. Bitte melde dich an oder kontaktiere den Fanclub.",
      );
    }
    throw new Error(createErr.message);
  }

  const userId = created.user.id;
  await syncApplicantProfile(admin, userId, input, username);
  return { userId, created: true };
}

async function syncApplicantProfile(
  admin: SupabaseClient,
  userId: string,
  input: ApplicantProfileInput,
  username?: string,
) {
  const start =
    input.membership_start_date?.trim() ||
    new Date().toISOString().slice(0, 10);
  const end = addYear(start);
  const fee_cents = 1500;

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "member",
      username: username ?? (await uniqueUsername(admin, input.first_name, input.last_name)),
      email: input.email.trim().toLowerCase(),
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      birthdate: input.birthdate,
      gender: input.gender?.trim() || null,
      street: input.street.trim(),
      postal_code: input.postal_code.trim(),
      city: input.city.trim(),
      country: input.country.trim(),
      phone: input.phone.trim(),
    },
    { onConflict: "id" },
  );
  if (profileErr) throw new Error(profileErr.message);

  const { syncProfileMapCoords } = await import("@/lib/members/geocode-profile");
  await syncProfileMapCoords(admin, userId);

  const { data: existingMembership } = await admin
    .from("memberships")
    .select("id,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingMembership?.id) {
    const { error: updErr } = await admin
      .from("memberships")
      .update({
        start_date: start,
        end_date: end,
        fee_cents,
        status: "applied",
      })
      .eq("id", existingMembership.id);
    if (updErr) throw new Error(updErr.message);
  } else {
    const { error: insErr } = await admin.from("memberships").insert({
      user_id: userId,
      start_date: start,
      end_date: end,
      fee_cents,
      status: "applied",
    });
    if (insErr) throw new Error(insErr.message);
  }
}

export function membershipStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "applied":
      return "Mitgliedschaft beantragt";
    case "active":
      return "Aktiv";
    case "inactive":
      return "Inaktiv";
    default:
      return status ?? "—";
  }
}
