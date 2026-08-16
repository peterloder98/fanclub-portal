"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";
import {
  isRealMemberEmail,
  sendMemberLoginEmailChangedNotice,
} from "@/lib/email/member-login-email-changed";
import { logAdminAction } from "@/lib/admin/audit-log";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import {
  allocateNextMembershipNumber,
  isAssignedMembershipNumber,
} from "@/lib/membership/numbers";
import { normalizeMemberCountryCode } from "@/lib/members/country";
import { rotateAccountSetupToken } from "@/lib/auth/account-setup-token";
import { ensureOpenMembershipFeePayment } from "@/lib/payments/membership-fee-payment";
import { deleteMemberCompletely } from "@/lib/membership/delete-member";
import { userFacingActionError } from "@/lib/admin/user-facing-action-error";

const schema = z.object({
  membership_number: z.string().optional().default(""),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  street: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().min(2, "Land ist Pflichtfeld."),
  birthdate: z.string().optional().default(""),
  gender: z.enum(["m", "w", "d"], { message: "Geschlecht ist Pflichtfeld." }),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  membership_start: z.string().optional().default(""),
  fee_eur: z.coerce.number().min(0).default(15),
  status: z.enum(["active", "inactive", "applied"]).default("applied"),
  role: z.enum(["member", "anni", "admin"]).default("member"),
});

const updateSchema = z.object({
  user_id: z.string().uuid(),
  membership_number: z.string().optional().default(""),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  street: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().min(2, "Land ist Pflichtfeld."),
  birthdate: z.string().optional().default(""),
  gender: z.enum(["m", "w", "d"], { message: "Geschlecht ist Pflichtfeld." }),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "E-Mail ungültig.",
    }),
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
  const startInput = input.membership_start.trim();
  let status = input.status;
  if (!startInput && status === "active") {
    status = "applied";
  }

  const passwordTemp = crypto.randomUUID();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: passwordTemp,
    email_confirm: status === "active",
    user_metadata: {
      role: input.role,
      username,
      first_name: input.first_name,
      last_name: input.last_name,
    },
  });
  if (createErr) throw new Error(createErr.message);

  const userId = created.user.id;

  // Profile — Mitgliedsnummer erst bei Freigabe (Status aktiv)
  let membershipNumber = input.membership_number?.trim() || null;
  if (status === "active" && !membershipNumber) {
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
      country: input.country ? normalizeMemberCountryCode(input.country) : "DE",
      phone: input.phone || null,
    },
    { onConflict: "id" },
  );
  if (profileErr) throw new Error(profileErr.message);
  await syncProfileMapCoords(admin, userId);

  // Membership — ohne Beitrittsdatum: Antrag (DB braucht ein Datum → Erfassungsdatum)
  const start = startInput || new Date().toISOString().slice(0, 10);
  const end = addYear(start);
  const fee_cents = Math.round((input.fee_eur ?? 0) * 100);

  const { data: membershipRow, error: membershipErr } = await admin
    .from("memberships")
    .insert({
      user_id: userId,
      start_date: start,
      end_date: end,
      fee_cents,
      status,
    })
    .select("id")
    .single();
  if (membershipErr) throw new Error(membershipErr.message);

  await logAdminAction(admin, {
    actorId: user.id,
    action: "member.create",
    entityType: "profile",
    entityId: userId,
    summary:
      status === "applied"
        ? `Antrag erfasst (noch kein Mitglied): ${input.first_name} ${input.last_name}`
        : `Mitglied angelegt: ${input.first_name} ${input.last_name}`,
  });

  if (status === "applied" && membershipRow?.id) {
    await ensureOpenMembershipFeePayment({
      userId,
      membershipId: membershipRow.id,
      amountCents: fee_cents || 1500,
      firstName: input.first_name,
      lastName: input.last_name,
    }).catch((e) => {
      console.error("[members] Offene Beitragszahlung konnte nicht angelegt werden:", e);
    });
    redirect(`/admin/members/${userId}?paperMail=1`);
  }

  const { setupUrl } = await rotateAccountSetupToken({
    email: input.email,
    userId,
  });
  redirect(`/admin/members?invite=${encodeURIComponent(setupUrl)}`);
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

  let input: z.infer<typeof updateSchema>;
  try {
    input = updateSchema.parse(Object.fromEntries(formData.entries()));
  } catch {
    redirect(
      `/admin/members/${String(formData.get("user_id") ?? "")}/edit?error=${encodeURIComponent("Eingaben ungültig.")}`,
    );
  }
  const admin = createSupabaseAdminClient();

  const fail = (msg: string): never => {
    redirect(`/admin/members/${input.user_id}/edit?error=${encodeURIComponent(msg)}`);
  };

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("membership_number,email,gender")
    .eq("id", input.user_id)
    .maybeSingle();

  const nextEmail = input.email.trim().toLowerCase() || null;
  const previousEmail = existingProfile?.email?.trim().toLowerCase() || null;
  let notifyLoginEmailChange: { oldEmail: string; newEmail: string } | null = null;

  if (nextEmail && nextEmail !== previousEmail) {
    const { data: emailClash } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", nextEmail)
      .neq("id", input.user_id)
      .maybeSingle();
    if (emailClash) {
      fail("Diese E-Mail ist bereits einem anderen Mitglied zugeordnet.");
    }
    const { error: authEmailErr } = await admin.auth.admin.updateUserById(input.user_id, {
      email: nextEmail,
      email_confirm: true,
    });
    if (authEmailErr) {
      fail(
        /already|registered|exists/i.test(authEmailErr.message)
          ? "Diese E-Mail ist bereits als Login vergeben."
          : `E-Mail konnte nicht gesetzt werden: ${authEmailErr.message}`,
      );
    }
    // Nur wenn schon eine echte Login-Mail existierte (Zugang vorhanden)
    if (isRealMemberEmail(previousEmail)) {
      notifyLoginEmailChange = { oldEmail: previousEmail, newEmail: nextEmail };
    }
  }

  let membershipNumber = input.membership_number?.trim() || null;
  const previousNumber = isAssignedMembershipNumber(existingProfile?.membership_number)
    ? existingProfile!.membership_number!.trim()
    : null;
  if (input.status === "active" && !membershipNumber && !previousNumber) {
    membershipNumber = await allocateNextMembershipNumber(admin);
  } else if (!membershipNumber) {
    membershipNumber = previousNumber;
  }
  if (membershipNumber && membershipNumber !== previousNumber) {
    const { data: clash } = await admin
      .from("profiles")
      .select("id")
      .eq("membership_number", membershipNumber)
      .neq("id", input.user_id)
      .maybeSingle();
    if (clash) {
      fail(
        `Das ist nicht möglich, da die Mitgliedsnummer ${membershipNumber} bereits vorhanden ist.`,
      );
    }
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      membership_number: membershipNumber,
      first_name: input.first_name,
      last_name: input.last_name,
      email: nextEmail,
      role: input.role,
      birthdate: input.birthdate || null,
      gender: input.gender,
      street: input.street || null,
      postal_code: input.postal_code || null,
      city: input.city || null,
      country: input.country ? normalizeMemberCountryCode(input.country) : "DE",
      phone: input.phone || null,
    })
    .eq("id", input.user_id);
  if (profileErr) {
    if (/membership_number|duplicate|unique/i.test(profileErr.message)) {
      fail(
        `Das ist nicht möglich, da die Mitgliedsnummer ${membershipNumber ?? ""} bereits vorhanden ist.`,
      );
    }
    fail(profileErr.message);
  }
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
  const startUpdate = input.membership_start.trim();
  if (input.status === "active" && !startUpdate) {
    fail("Für eine aktive Mitgliedschaft bitte das Beitrittsdatum eintragen.");
  }
  if (latestMembership?.id) {
    const { error: mUpdErr } = await admin
      .from("memberships")
      .update({
        start_date: startUpdate || undefined,
        end_date: input.membership_end.trim() || undefined,
        fee_cents,
        status: input.status,
      })
      .eq("id", latestMembership.id);
    if (mUpdErr) throw new Error(mUpdErr.message);
  }

  if (previousStatus === "applied" && input.status === "active") {
    const { data: profile } = await admin
      .from("profiles")
      .select("email,first_name,membership_number,gender")
      .eq("id", input.user_id)
      .maybeSingle();
    if (profile?.email) {
      await admin.auth.admin.updateUserById(input.user_id, { email_confirm: true });
      const mail = await sendMemberInviteAfterApproval({
        email: profile.email,
        firstName: profile.first_name?.trim() || "Fan",
        membershipNumber: profile.membership_number?.trim() || "—",
        gender: profile.gender,
        userId: input.user_id,
      }).catch((e) => {
        console.error("[membership] Einladungs-E-Mail fehlgeschlagen:", e);
        return { ok: false as const, error: e instanceof Error ? e.message : "send failed" };
      });
      if (!mail.ok) {
        console.error(
          "[membership] Einladungs-E-Mail nicht zugestellt:",
          "error" in mail ? mail.error : "reason" in mail ? mail.reason : mail,
        );
        await logAdminAction(admin, {
          actorId: user.id,
          action: "member.update",
          entityType: "profile",
          entityId: input.user_id,
          summary: `Mitglied aktiviert, Einladungs-E-Mail fehlgeschlagen: ${input.first_name} ${input.last_name}`,
          metadata: { invite_email_ok: false },
        });
        redirect(`/admin/members/${input.user_id}?invite_email=failed`);
      }
    }
  }

  if (notifyLoginEmailChange) {
    await sendMemberLoginEmailChangedNotice({
      firstName: input.first_name,
      gender: existingProfile?.gender,
      oldEmail: notifyLoginEmailChange.oldEmail,
      newEmail: notifyLoginEmailChange.newEmail,
      userId: input.user_id,
    }).catch((e) => {
      console.error("[membership] Login-E-Mail-Änderungshinweis fehlgeschlagen:", e);
    });
  }

  await logAdminAction(admin, {
    actorId: user.id,
    action: "member.update",
    entityType: "profile",
    entityId: input.user_id,
    summary: notifyLoginEmailChange
      ? `Mitglied bearbeitet (Login-E-Mail → ${notifyLoginEmailChange.newEmail}): ${input.first_name} ${input.last_name}`
      : `Mitglied bearbeitet: ${input.first_name} ${input.last_name}`,
  });

  redirect(`/admin/members/${input.user_id}`);
}

export async function deleteMember(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Nicht angemeldet." };
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (me?.role !== "admin") return { ok: false, error: "Keine Berechtigung." };

    const admin = createSupabaseAdminClient();
    const result = await deleteMemberCompletely(admin, userId);

    await logAdminAction(admin, {
      actorId: user.id,
      action: "member.delete",
      entityType: "profile",
      entityId: userId,
      summary: result.name
        ? `Mitgliedskonto gelöscht: ${result.name}`
        : "Mitgliedskonto gelöscht",
    });
    revalidatePath("/admin/members");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: userFacingActionError(
        e,
        "Mitglied konnte nicht gelöscht werden. Bitte Seite neu laden und erneut versuchen.",
      ),
    };
  }
}

