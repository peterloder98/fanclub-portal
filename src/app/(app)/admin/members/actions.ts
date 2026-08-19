"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";
import { sendMemberLoginEmailChangedNotice } from "@/lib/email/member-login-email-changed";
import { isRealMemberEmail } from "@/lib/email/is-real-member-email";
import { logAdminAction } from "@/lib/admin/audit-log";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import {
  allocateNextMembershipNumber,
  isAssignedMembershipNumber,
} from "@/lib/membership/numbers";
import { normalizeMemberCountryCode } from "@/lib/members/country";
import { slugifyMemberUsername } from "@/lib/members/username";
import { rotateAccountSetupToken } from "@/lib/auth/account-setup-token";
import { ensureOpenMembershipFeePayment } from "@/lib/payments/membership-fee-payment";
import { deleteMemberCompletely } from "@/lib/membership/delete-member";
import { userFacingActionError } from "@/lib/admin/user-facing-action-error";
import {
  generateNoAppAuthEmail,
  isNoAppPlaceholderEmail,
} from "@/lib/members/no-app-access";

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
  email: z.string().optional().default(""),
  no_app_access: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  billing_email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  membership_start: z.string().optional().default(""),
  fee_eur: z.preprocess((v) => {
    if (typeof v === "string") return v.trim().replace(",", ".");
    return v;
  }, z.coerce.number().min(0).default(15)),
  status: z.enum(["active", "inactive", "applied"]).default("applied"),
  role: z.enum(["member", "anni", "admin"]).default("member"),
}).superRefine((data, ctx) => {
  if (data.no_app_access) {
    const billing = data.billing_email.trim().toLowerCase();
    if (!z.string().email().safeParse(billing).success) {
      ctx.addIssue({
        code: "custom",
        message: "Bitte eine E-Mail nur für Beitragszahlungen eintragen (z. B. der Mutter).",
        path: ["billing_email"],
      });
    }
  } else {
    const email = data.email.trim().toLowerCase();
    if (!z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: "custom",
        message: "Bitte eine gültige E-Mail eintragen.",
        path: ["email"],
      });
    }
  }
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
    .refine(
      (v) =>
        !v ||
        v.toLowerCase().includes("fanclub-import.invalid") ||
        z.string().email().safeParse(v).success,
      { message: "E-Mail ungültig." },
    ),
  no_app_access: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  billing_email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  membership_start: z.string().optional().default(""),
  membership_end: z.string().optional().default(""),
  fee_eur: z.coerce.number().min(0).default(15),
  status: z.enum(["active", "inactive", "applied"]).default("active"),
  role: z.enum(["member", "anni", "admin"]).default("member"),
}).superRefine((data, ctx) => {
  if (data.no_app_access) {
    const billing = data.billing_email.trim().toLowerCase();
    if (!z.string().email().safeParse(billing).success) {
      ctx.addIssue({
        code: "custom",
        message: "Bitte eine E-Mail nur für Beitragszahlungen eintragen.",
        path: ["billing_email"],
      });
    }
  } else {
    const email = data.email.trim().toLowerCase();
    if (
      !z.string().email().safeParse(email).success ||
      email.includes("fanclub-import.invalid")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Bitte eine gültige Login-E-Mail eintragen.",
        path: ["email"],
      });
    }
  }
});

function baseUsername(first: string, last: string) {
  return slugifyMemberUsername(first, last);
}

function addYear(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function mapCreateUserError(message: string) {
  if (/already|registered|exists/i.test(message)) {
    return "Diese E-Mail ist bereits als Login vergeben.";
  }
  if (/invalid.*email|email.*invalid/i.test(message)) {
    return "E-Mail-Adresse ist ungültig.";
  }
  return message;
}

export async function createMember(
  formData: FormData,
): Promise<{ ok: false; error: string } | { ok: true; href: string }> {
  try {
    const { user } = await requireAdminAction();

    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Eingaben ungültig." };
    }
    const input = parsed.data;
    const admin = createSupabaseAdminClient();
    const noApp = Boolean(input.no_app_access);
    const billingEmail = input.billing_email.trim().toLowerCase() || null;
    const email = noApp ? generateNoAppAuthEmail() : input.email.trim().toLowerCase();

    if (!noApp) {
      const { data: emailTaken } = await admin
        .from("profiles")
        .select("id,first_name,last_name")
        .ilike("email", email)
        .maybeSingle();
      if (emailTaken) {
        return {
          ok: false,
          error: `Diese E-Mail ist bereits vergeben (${emailTaken.first_name} ${emailTaken.last_name}).`,
        };
      }
    }

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

    const startInput = input.membership_start.trim();
    let status = input.status;
    if (!startInput && status === "active") {
      status = "applied";
    }

    const passwordTemp = crypto.randomUUID();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: passwordTemp,
      email_confirm: status === "active" && !noApp,
      user_metadata: {
        role: input.role,
        username,
        first_name: input.first_name,
        last_name: input.last_name,
      },
    });
    if (createErr || !created.user) {
      return {
        ok: false,
        error: mapCreateUserError(createErr?.message ?? "Konto konnte nicht angelegt werden."),
      };
    }

    const userId = created.user.id;

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
        email,
        first_name: input.first_name,
        last_name: input.last_name,
        birthdate: input.birthdate || null,
        gender: input.gender,
        street: input.street || null,
        postal_code: input.postal_code || null,
        city: input.city || null,
        country: input.country ? normalizeMemberCountryCode(input.country) : "DE",
        phone: input.phone || null,
        no_app_access: noApp,
        billing_email: noApp ? billingEmail : null,
        app_registration_status: noApp ? "deleted" : "open",
        app_registration_deleted_at: noApp ? new Date().toISOString() : null,
      },
      { onConflict: "id" },
    );
    if (profileErr) {
      if (/no_app_access|billing_email|does not exist/i.test(profileErr.message)) {
        return {
          ok: false,
          error:
            "Datenbank-Spalte fehlt. Bitte supabase/153_no_app_access_billing_email.sql im SQL-Editor ausführen.",
        };
      }
      return { ok: false, error: profileErr.message };
    }
    void syncProfileMapCoords(admin, userId).catch((e) => {
      console.error("[members] Karten-Koordinaten:", e);
    });

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
    if (membershipErr) {
      return { ok: false, error: membershipErr.message };
    }

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
    }

    if (noApp) {
      revalidatePath("/admin/members");
      if (status === "applied") {
        return { ok: true, href: `/admin/members/${userId}?paperMail=1` };
      }
      return { ok: true, href: `/admin/members/${userId}` };
    }

    if (status === "applied" && membershipRow?.id) {
      revalidatePath("/admin/members");
      return { ok: true, href: `/admin/members/${userId}?paperMail=1` };
    }

    const { setupUrl } = await rotateAccountSetupToken({
      email,
      userId,
    });
    revalidatePath("/admin/members");
    return { ok: true, href: `/admin/members?invite=${encodeURIComponent(setupUrl)}` };
  } catch (e) {
    return {
      ok: false,
      error: userFacingActionError(
        e,
        "Person konnte nicht angelegt werden. Bitte erneut versuchen — du bleibst angemeldet.",
      ),
    };
  }
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

  const { data: existingFull, error: existingErr } = await admin
    .from("profiles")
    .select("membership_number,email,gender,no_app_access,billing_email")
    .eq("id", input.user_id)
    .maybeSingle();
  let existingProfile = existingFull;
  if (existingErr && /no_app_access|billing_email|does not exist/i.test(existingErr.message)) {
    const fb = await admin
      .from("profiles")
      .select("membership_number,email,gender")
      .eq("id", input.user_id)
      .maybeSingle();
    existingProfile = fb.data
      ? { ...fb.data, no_app_access: false, billing_email: null }
      : null;
  }

  const noApp = Boolean(input.no_app_access);
  const billingEmail = noApp ? input.billing_email.trim().toLowerCase() || null : null;
  const previousEmail = existingProfile?.email?.trim().toLowerCase() || null;
  let nextEmail = input.email.trim().toLowerCase() || null;
  if (noApp) {
    nextEmail =
      previousEmail && isNoAppPlaceholderEmail(previousEmail)
        ? previousEmail
        : generateNoAppAuthEmail();
  }
  let notifyLoginEmailChange: { oldEmail: string; newEmail: string } | null = null;

  if (nextEmail && nextEmail !== previousEmail) {
    if (isRealMemberEmail(nextEmail)) {
      const { data: emailClash } = await admin
        .from("profiles")
        .select("id")
        .ilike("email", nextEmail)
        .neq("id", input.user_id)
        .maybeSingle();
      if (emailClash) {
        fail("Diese E-Mail ist bereits einem anderen Mitglied zugeordnet.");
      }
    }
    const { error: authEmailErr } = await admin.auth.admin.updateUserById(input.user_id, {
      email: nextEmail,
      email_confirm: isRealMemberEmail(nextEmail),
    });
    if (authEmailErr) {
      fail(
        /already|registered|exists/i.test(authEmailErr.message)
          ? "Diese E-Mail ist bereits als Login vergeben."
          : `E-Mail konnte nicht gesetzt werden: ${authEmailErr.message}`,
      );
    }
    if (isRealMemberEmail(previousEmail) && isRealMemberEmail(nextEmail)) {
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
      no_app_access: noApp,
      billing_email: billingEmail,
      ...(noApp
        ? {
            app_registration_status: "deleted",
            app_registration_deleted_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq("id", input.user_id);
  if (profileErr) {
    if (/no_app_access|billing_email|does not exist/i.test(profileErr.message)) {
      fail("Datenbank-Spalte fehlt. Bitte supabase/153_no_app_access_billing_email.sql ausführen.");
    }
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
    if (profile?.email && isRealMemberEmail(profile.email) && !noApp) {
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

