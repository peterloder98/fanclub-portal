"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";
import { logAdminAction } from "@/lib/admin/audit-log";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { allocateNextMembershipNumber } from "@/lib/membership/numbers";

const schema = z.object({
  membership_number: z.string().optional().default(""),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  street: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().optional().default("DE"),
  birthdate: z.string().optional().default(""),
  gender: z.enum(["m", "w", "d"], { message: "Geschlecht ist Pflichtfeld." }),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  membership_start: z.string().min(1),
  fee_eur: z.coerce.number().min(0).default(15),
  status: z.enum(["active", "inactive", "applied"]).default("active"),
  role: z.enum(["member", "anni", "admin"]).default("member"),
});

const updateSchema = z.object({
  user_id: z.string().uuid(),
  membership_number: z.string().optional().default(""),
  contribution_date: z.string().optional().default(""),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  street: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().optional().default("DE"),
  birthdate: z.string().optional().default(""),
  gender: z.enum(["m", "w", "d"], { message: "Geschlecht ist Pflichtfeld." }),
  phone: z.string().optional().default(""),
  membership_start: z.string().optional().default(""),
  membership_end: z.string().optional().default(""),
  fee_eur: z.coerce.number().min(0).default(15),
  status: z.enum(["active", "inactive", "applied"]).default("active"),
  role: z.enum(["member", "anni", "admin"]).default("member"),
});

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

export async function createMember(formData: FormData) {
  // Auth + role check
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const input = schema.parse(Object.fromEntries(formData.entries()));
  const admin = createSupabaseAdminClient();

  // Generate unique username
  const base = baseUsername(input.first_name, input.last_name);
  let username = base;
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`;
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();
    if (!existing) {
      username = candidate;
      break;
    }
  }

  // Create auth user + generate recovery (invite) link
  const passwordTemp = crypto.randomUUID();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: passwordTemp,
    email_confirm: true,
    user_metadata: {
      role: input.role,
      username,
      first_name: input.first_name,
      last_name: input.last_name,
    },
  });
  if (createErr) throw new Error(createErr.message);

  const userId = created.user.id;

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "recovery",
      email: input.email,
    });
  if (linkErr) throw new Error(linkErr.message);

  // Profile — Mitgliedsnummer erst bei Freigabe (Status aktiv)
  let membershipNumber = input.membership_number?.trim() || null;
  if (input.status === "active" && !membershipNumber) {
    membershipNumber = await allocateNextMembershipNumber(admin);
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: input.role,
      username,
      membership_number: membershipNumber,
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      birthdate: input.birthdate || null,
      gender: input.gender,
      street: input.street || null,
      postal_code: input.postal_code || null,
      city: input.city || null,
      country: input.country || null,
      phone: input.phone || null,
    },
    { onConflict: "id" },
  );
  if (profileErr) throw new Error(profileErr.message);
  await syncProfileMapCoords(admin, userId);

  // Membership
  const start = input.membership_start;
  const end = addYear(start);
  const fee_cents = Math.round((input.fee_eur ?? 0) * 100);

  const { error: membershipErr } = await admin.from("memberships").insert({
    user_id: userId,
    start_date: start,
    end_date: end,
    fee_cents,
    status: input.status,
  });
  if (membershipErr) throw new Error(membershipErr.message);

  await logAdminAction(admin, {
    actorId: user.id,
    action: "member.create",
    entityType: "profile",
    entityId: userId,
    summary: `Mitglied angelegt: ${input.first_name} ${input.last_name}`,
  });

  // Store the invite link temporarily in a redirect param for now
  redirect(`/admin/members?invite=${encodeURIComponent(linkData.properties.action_link)}`);
}

export async function updateMember(formData: FormData) {
  // Auth + role check
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const input = updateSchema.parse(Object.fromEntries(formData.entries()));
  const admin = createSupabaseAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("membership_number")
    .eq("id", input.user_id)
    .maybeSingle();

  let membershipNumber = input.membership_number?.trim() || null;
  if (
    input.status === "active" &&
    !membershipNumber &&
    !existingProfile?.membership_number?.trim()
  ) {
    membershipNumber = await allocateNextMembershipNumber(admin);
  } else if (!membershipNumber) {
    membershipNumber = existingProfile?.membership_number?.trim() || null;
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      membership_number: membershipNumber,
      contribution_date: input.contribution_date?.trim() || null,
      first_name: input.first_name,
      last_name: input.last_name,
      role: input.role,
      birthdate: input.birthdate || null,
      gender: input.gender,
      street: input.street || null,
      postal_code: input.postal_code || null,
      city: input.city || null,
      country: input.country || null,
      phone: input.phone || null,
    })
    .eq("id", input.user_id);
  if (profileErr) throw new Error(profileErr.message);
  await syncProfileMapCoords(admin, input.user_id);

  // Update membership: update latest row (best-effort)
  const { data: latestMembership, error: mSelErr } = await admin
    .from("memberships")
    .select("id,status")
    .eq("user_id", input.user_id)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mSelErr) throw new Error(mSelErr.message);

  const previousStatus = latestMembership?.status ?? null;
  const fee_cents = Math.round((input.fee_eur ?? 0) * 100);
  if (latestMembership?.id) {
    const { error: mUpdErr } = await admin
      .from("memberships")
      .update({
        start_date: input.membership_start || undefined,
        end_date: input.membership_end || undefined,
        fee_cents,
        status: input.status,
      })
      .eq("id", latestMembership.id);
    if (mUpdErr) throw new Error(mUpdErr.message);
  }

  if (previousStatus === "applied" && input.status === "active") {
    const { data: profile } = await admin
      .from("profiles")
      .select("email,first_name")
      .eq("id", input.user_id)
      .maybeSingle();
    if (profile?.email) {
      await admin.auth.admin.updateUserById(input.user_id, { email_confirm: true });
      await sendMemberInviteAfterApproval({
        email: profile.email,
        firstName: profile.first_name?.trim() || "Fan",
      }).catch((e) => {
        console.error("[membership] Einladungs-E-Mail fehlgeschlagen:", e);
      });
    }
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: "member.update",
    entityType: "profile",
    entityId: input.user_id,
    summary: `Mitglied bearbeitet: ${input.first_name} ${input.last_name}`,
  });

  redirect(`/admin/members/${input.user_id}`);
}

export async function deleteMember(userId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  await logAdminAction(admin, {
    actorId: user.id,
    action: "member.delete",
    entityType: "profile",
    entityId: userId,
    summary: "Mitgliedskonto gelöscht",
  });
  revalidatePath("/admin/members");
  redirect("/admin/members");
}

