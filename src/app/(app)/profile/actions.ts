"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncProfileMapCoords } from "@/lib/members/geocode-profile";
import { normalizeMemberCountryCode } from "@/lib/members/country";
import {
  isMemberVisibleActivity,
  logMemberActivity,
  MEMBER_ACTIVITY_TYPES,
  type MemberActivityRow,
} from "@/lib/membership/activity-log";
import { getMemberContributionInfo } from "@/lib/club/membership-contribution";
import type { MemberContributionInfo } from "@/lib/club/membership-contribution";
import { rankFromPoints } from "@/lib/points/rank";
import {
  diffProfileChanges,
  type ProfileChangeField,
  type ProfileChangeValues,
} from "@/lib/profile/change-requests";
import { notifyAdminsProfileChangeRequest } from "@/lib/email/profile-change-notify";

export type MyWarningRow = {
  id: string;
  comment_text: string;
  comment_created_at: string;
  context_title: string | null;
  context_author_name: string | null;
  context_kind: string;
  created_at: string;
};

export type PendingProfileChange = {
  id: string;
  previous: Partial<ProfileChangeValues>;
  proposed: Partial<ProfileChangeValues>;
  created_at: string;
};

export type MyProfileBundle = {
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    username: string;
    phone: string | null;
    birthdate: string | null;
    gender: string | null;
    street: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    membership_number: string | null;
    warning_count: number;
    avatar_path: string | null;
    role: "admin" | "anni" | "member";
  };
  membership: {
    start_date: string | null;
    end_date: string | null;
    status: string | null;
    fee_cents: number | null;
  } | null;
  contribution: MemberContributionInfo | null;
  warnings: MyWarningRow[];
  activity: MemberActivityRow[];
  pendingProfileChange: PendingProfileChange | null;
  yearPoints: number;
  yearRank: string;
};

const updateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional().default(""),
  birthdate: z.string().optional().default(""),
  gender: z.enum(["m", "w", "d"], { message: "Geschlecht ist Pflichtfeld." }),
  street: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().min(1, "Land ist Pflichtfeld."),
});

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function loadMyProfileBundle(): Promise<MyProfileBundle> {
  const { supabase, user } = await requireAuthenticatedUser();

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "id,first_name,last_name,email,username,phone,birthdate,gender,street,postal_code,city,country,membership_number,warning_count,avatar_path,role",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);
  if (!profile) throw new Error("Profil nicht gefunden.");

  const { data: membership } = await supabase
    .from("memberships")
    .select("start_date,end_date,status,fee_cents")
    .eq("user_id", user.id)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: warnings, error: warnErr } = await supabase
    .from("member_warnings")
    .select(
      "id,comment_text,comment_created_at,context_title,context_author_name,context_kind,created_at",
    )
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });
  if (warnErr) {
    if (/member_warnings|does not exist|permission/i.test(warnErr.message)) {
      // Migration noch nicht ausgeführt — Verwarnungen leer lassen
    } else {
      throw new Error(warnErr.message);
    }
  }

  const { data: activityRaw, error: actErr } = await supabase
    .from("member_activity_log")
    .select("id,event_type,title,details,link_url,link_label,created_at,created_by,metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);
  if (actErr) throw new Error(actErr.message);

  const creatorIds = Array.from(
    new Set((activityRaw ?? []).map((r) => r.created_by).filter(Boolean)),
  ) as string[];
  const { data: creators } = creatorIds.length
    ? await supabase.from("profiles").select("id,first_name,last_name").in("id", creatorIds)
    : { data: [] };
  const nameById = new Map(
    (creators ?? []).map((p) => [
      p.id,
      `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Vorstand",
    ]),
  );

  const activity: MemberActivityRow[] = (activityRaw ?? [])
    .filter((r) => isMemberVisibleActivity(r.event_type))
    .map((r) => ({
      id: r.id,
      event_type: r.event_type,
      title: r.title,
      details: r.details,
      link_url: r.link_url,
      link_label: r.link_label,
      created_at: r.created_at,
      created_by_name: r.created_by ? (nameById.get(r.created_by) ?? null) : null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
    }));

  let contribution: MemberContributionInfo | null = null;
  try {
    contribution = await getMemberContributionInfo(user.id);
  } catch {
    contribution = null;
  }

  let pendingProfileChange: PendingProfileChange | null = null;
  {
    const { data: pendingRow, error: pendingErr } = await supabase
      .from("profile_change_requests")
      .select("id,previous,proposed,created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pendingErr && pendingRow) {
      pendingProfileChange = {
        id: pendingRow.id,
        previous: (pendingRow.previous ?? {}) as Partial<ProfileChangeValues>,
        proposed: (pendingRow.proposed ?? {}) as Partial<ProfileChangeValues>,
        created_at: pendingRow.created_at,
      };
    }
  }

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const { data: pointsRows } = await supabase
    .from("points_transactions")
    .select("points")
    .eq("user_id", user.id)
    .gte("created_at", yearStart);
  const yearPoints = (pointsRows ?? []).reduce((sum, r) => sum + (r.points ?? 0), 0);
  const yearRank = rankFromPoints(yearPoints);

  return {
    profile: {
      ...profile,
      role: (profile.role ?? "member") as "admin" | "anni" | "member",
    },
    membership: membership ?? null,
    contribution,
    warnings: (warnings ?? []) as MyWarningRow[],
    activity,
    pendingProfileChange,
    yearPoints,
    yearRank,
  };
}

export async function updateMyProfile(formData: FormData) {
  const { supabase, user } = await requireAuthenticatedUser();
  const input = updateSchema.parse(Object.fromEntries(formData.entries()));
  const country = normalizeMemberCountryCode(input.country);

  const { data: current, error: curErr } = await supabase
    .from("profiles")
    .select(
      "first_name,last_name,phone,birthdate,gender,street,postal_code,city,country,membership_number,role",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (curErr) throw new Error(curErr.message);
  if (!current) throw new Error("Profil nicht gefunden.");

  const after: Partial<Record<ProfileChangeField, string | null>> = {
    first_name: input.first_name,
    last_name: input.last_name,
    phone: input.phone || null,
    birthdate: input.birthdate || null,
    gender: input.gender,
    street: input.street || null,
    postal_code: input.postal_code || null,
    city: input.city || null,
    country,
  };

  const { previous, proposed } = diffProfileChanges(current, after);
  if (!Object.keys(proposed).length) {
    revalidatePath("/profile");
    return { ok: true as const, unchanged: true };
  }

  // Admins dürfen Stammdaten direkt speichern (kein Freigabe-Workflow).
  if (current.role === "admin") {
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: input.first_name,
        last_name: input.last_name,
        phone: input.phone || null,
        birthdate: input.birthdate || null,
        gender: input.gender,
        street: input.street || null,
        postal_code: input.postal_code || null,
        city: input.city || null,
        country,
      })
      .eq("id", user.id);
    if (error) throw new Error(error.message);

    const admin = createSupabaseAdminClient();
    await syncProfileMapCoords(admin, user.id);

    await logMemberActivity({
      userId: user.id,
      eventType: MEMBER_ACTIVITY_TYPES.profileSelfUpdated,
      title: "Profildaten aktualisiert",
      details: "Stammdaten im Mitgliederbereich geändert.",
      createdBy: user.id,
    });

    revalidatePath("/profile");
    return { ok: true as const, unchanged: false, pending: false };
  }

  const admin = createSupabaseAdminClient();

  // Bestehende offene Anfrage ersetzen
  await admin
    .from("profile_change_requests")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending");

  const { data: request, error: insErr } = await admin
    .from("profile_change_requests")
    .insert({
      user_id: user.id,
      previous,
      proposed,
      status: "pending",
    })
    .select("id,created_at")
    .single();

  if (insErr || !request) {
    throw new Error(
      /profile_change_requests|does not exist/i.test(insErr?.message ?? "")
        ? "Freigabe-Tabelle fehlt — bitte SQL 097 in Supabase ausführen."
        : insErr?.message ?? "Änderungsantrag konnte nicht gespeichert werden.",
    );
  }

  const memberName = `${input.first_name} ${input.last_name}`.trim() || "Mitglied";

  await logMemberActivity({
    userId: user.id,
    eventType: MEMBER_ACTIVITY_TYPES.profileChangeRequested,
    title: "Stammdaten-Änderung eingereicht",
    details: "Wartet auf Freigabe durch den Vorstand.",
    createdBy: user.id,
    metadata: { request_id: request.id, fields: Object.keys(proposed) },
  });

  void notifyAdminsProfileChangeRequest({
    requestId: request.id,
    membershipNumber: current.membership_number,
    memberName,
    createdAt: request.created_at,
  });

  revalidatePath("/profile");
  revalidatePath("/admin/members/profile-changes");
  return { ok: true as const, unchanged: false, pending: true };
}

const emailSchema = z
  .string()
  .trim()
  .email("Bitte eine gültige E-Mail-Adresse eingeben.")
  .transform((v) => v.toLowerCase());

/** E-Mail (Login) sofort ändern — ohne Admin-Freigabe. */
export async function updateMyEmail(formData: FormData) {
  const { supabase, user } = await requireAuthenticatedUser();
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige E-Mail.");
  }
  const email = parsed.data;

  const { data: current } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();
  const currentEmail = (current?.email ?? user.email ?? "").trim().toLowerCase();
  if (currentEmail === email) {
    revalidatePath("/profile");
    return { ok: true as const, unchanged: true };
  }

  const admin = createSupabaseAdminClient();

  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) {
    throw new Error("Diese E-Mail-Adresse wird bereits von einem anderen Mitglied verwendet.");
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
    email,
    email_confirm: true,
  });
  if (authErr) {
    throw new Error(
      /already|registered|exists|duplicate/i.test(authErr.message)
        ? "Diese E-Mail-Adresse ist bereits vergeben."
        : authErr.message,
    );
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .update({ email })
    .eq("id", user.id);
  if (profileErr) throw new Error(profileErr.message);

  await logMemberActivity({
    userId: user.id,
    eventType: MEMBER_ACTIVITY_TYPES.profileSelfUpdated,
    title: "E-Mail-Adresse geändert",
    details: `Login-E-Mail von ${currentEmail || "—"} auf ${email} geändert.`,
    createdBy: user.id,
  });

  revalidatePath("/profile");
  return { ok: true as const, unchanged: false };
}

