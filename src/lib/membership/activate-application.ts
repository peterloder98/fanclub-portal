import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMemberInviteAfterApproval } from "@/lib/email/membership-notify";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import {
  logMemberActivity,
  MEMBER_ACTIVITY_TYPES,
} from "@/lib/membership/activity-log";
import {
  awardMembershipReferralCompletionPoints,
  MEMBERSHIP_REFERRAL_COMPLETION_POINTS,
} from "@/lib/points/award-membership-referral-completed";
import {
  allocateNextMembershipNumber,
  isAssignedMembershipNumber,
} from "@/lib/membership/numbers";
import {
  consumeMembershipNumberReservation,
  getReservedMembershipNumber,
} from "@/lib/membership/number-reservations";
import { storeApprovedMemberContractPdf } from "@/lib/membership/application-pdf-service";
import { isRealMemberEmail } from "@/lib/email/is-real-member-email";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function assertApplicationFeePaid(
  admin: AdminClient,
  applicationId: string,
  userId: string,
) {
  const { data: paidByApp } = await admin
    .from("payments")
    .select("id")
    .eq("application_id", applicationId)
    .eq("payment_status", "paid")
    .limit(1)
    .maybeSingle();
  if (paidByApp) return;

  const { data: paidByUser } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("payment_type", "membership_fee")
    .eq("payment_status", "paid")
    .limit(1)
    .maybeSingle();
  if (paidByUser) return;

  throw new Error(
    "Freigabe erst nach bestätigter Beitragszahlung möglich. Bitte unter Admin → Zahlungen den Eingang bestätigen.",
  );
}

async function assignMembershipNumber(
  admin: AdminClient,
  userId: string,
  membershipNumber?: string,
): Promise<string> {
  const { data: profileBefore } = await admin
    .from("profiles")
    .select("membership_number")
    .eq("id", userId)
    .maybeSingle();

  let assignedNumber = isAssignedMembershipNumber(profileBefore?.membership_number)
    ? profileBefore!.membership_number!.trim()
    : null;
  if (assignedNumber) return assignedNumber;

  const reserved = await getReservedMembershipNumber(userId);
  const manual = membershipNumber?.trim() || reserved || null;
  const maxAttempts = manual ? 1 : 5;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    assignedNumber = manual || (await allocateNextMembershipNumber(admin));
    const { error: pErr } = await admin
      .from("profiles")
      .update({ membership_number: assignedNumber })
      .eq("id", userId);
    if (!pErr) {
      if (reserved && assignedNumber === reserved) {
        await consumeMembershipNumberReservation(userId).catch(console.error);
      }
      return assignedNumber;
    }
    if (!manual && /membership_number|duplicate|unique/i.test(pErr.message)) {
      lastErr = new Error(pErr.message);
      continue;
    }
    throw new Error(pErr.message);
  }
  throw lastErr ?? new Error("Mitgliedsnummer konnte nicht vergeben werden.");
}

export async function activateApplication(
  admin: AdminClient,
  applicationId: string,
  membershipNumber?: string,
  createdBy?: string,
) {
  const { data: app, error: appErr } = await admin
    .from("membership_applications")
    .select("id,user_id,email,first_name,last_name,gender,status,fee_cents,referred_by_user_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Antrag nicht gefunden.");
  if (!app.user_id) {
    throw new Error("Kein Benutzerkonto verknüpft — Antrag kann nicht freigeschaltet werden.");
  }
  if (app.status === "rejected") {
    throw new Error("Abgelehnte Anträge können nicht freigeschaltet werden.");
  }

  await assertApplicationFeePaid(admin, applicationId, app.user_id);

  const assignedNumber = await assignMembershipNumber(admin, app.user_id, membershipNumber);

  try {
    await storeApprovedMemberContractPdf(app.user_id, applicationId, assignedNumber);
  } catch (e) {
    console.error("[membership] Vertrags-PDF nach Freigabe fehlgeschlagen:", e);
  }

  const { data: membership } = await admin
    .from("memberships")
    .select("id,status,start_date")
    .eq("user_id", app.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.id) throw new Error("Mitgliedschaft nicht gefunden.");

  const today = new Date().toISOString().slice(0, 10);
  const { error: mErr } = await admin
    .from("memberships")
    .update({
      status: "active",
      start_date: membership.start_date || today,
    })
    .eq("id", membership.id);
  if (mErr) throw new Error(mErr.message);

  if (app.status !== "approved") {
    await admin
      .from("membership_applications")
      .update({ status: "approved" })
      .eq("id", applicationId);
  }

  const fullFlags = await admin
    .from("profiles")
    .select("email,no_app_access")
    .eq("id", app.user_id)
    .maybeSingle();
  let inviteLoginEmail = fullFlags.data?.email as string | null | undefined;
  let noApp = Boolean((fullFlags.data as { no_app_access?: boolean | null } | null)?.no_app_access);
  if (fullFlags.error && /no_app_access|does not exist/i.test(fullFlags.error.message)) {
    const fb = await admin.from("profiles").select("email").eq("id", app.user_id).maybeSingle();
    inviteLoginEmail = fb.data?.email;
    noApp = false;
  }

  if (!noApp) {
    await admin.auth.admin.updateUserById(app.user_id, { email_confirm: true });
  }

  try {
    const { syncProfileMapCoords } = await import("@/lib/members/geocode-profile");
    await syncProfileMapCoords(admin, app.user_id);
  } catch (e) {
    console.error("[membership] Geocoding nach Freigabe fehlgeschlagen:", e);
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  await logMemberActivity({
    userId: app.user_id,
    applicationId,
    eventType: MEMBER_ACTIVITY_TYPES.membershipApproved,
    title: "Mitgliedschaft freigegeben",
    details: `Mitgliedsnummer ${assignedNumber}. Status: aktiv.`,
    linkUrl: base ? `${base}/admin/members` : null,
    linkLabel: "Mitgliederliste",
    createdBy,
  }).catch(console.error);

  const baseUrl = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );

  if (!noApp) {
    await createUserNotification({
      userId: app.user_id,
      kind: NOTIFICATION_KINDS.membershipApproved,
      title: "Mitgliedschaft freigegeben",
      body: `Willkommen im Fanclub! Deine Mitgliedsnummer ist ${assignedNumber}.`,
      linkUrl: baseUrl ? `${baseUrl}/profile` : "/profile",
      linkLabel: "Mein Profil",
      metadata: { membership_number: assignedNumber, application_id: applicationId },
    }).catch(console.error);
  }

  let inviteEmailOk: boolean | null = null;
  const inviteEmail = app.email || inviteLoginEmail;
  if (!noApp && isRealMemberEmail(inviteEmail)) {
    const mail = await sendMemberInviteAfterApproval({
      email: inviteEmail,
      firstName: app.first_name?.trim() || "Fan",
      membershipNumber: assignedNumber,
      gender: app.gender,
      userId: app.user_id,
    }).catch((e) => {
      console.error("[membership] Freischaltungs-Mail fehlgeschlagen:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "send failed" };
    });
    inviteEmailOk = mail.ok;
    if (!mail.ok) {
      console.error(
        "[membership] Freischaltungs-Mail nicht zugestellt:",
        "error" in mail ? mail.error : "reason" in mail ? mail.reason : mail,
      );
    }
  }

  const referrerId = (app as { referred_by_user_id?: string | null }).referred_by_user_id;
  if (referrerId) {
    try {
      await awardMembershipReferralCompletionPoints(referrerId, applicationId);
    } catch (e) {
      console.error(`[points] Werbeprämie +${MEMBERSHIP_REFERRAL_COMPLETION_POINTS} fehlgeschlagen:`, e);
    }
  }

  return { app, inviteEmailOk, assignedNumber, alreadyApproved: app.status === "approved" };
}

async function activatePaperApplicant(
  admin: AdminClient,
  userId: string,
  createdBy?: string,
) {
  const assignedNumber = await assignMembershipNumber(admin, userId);

  const { data: membership } = await admin
    .from("memberships")
    .select("id,status,start_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership?.id) throw new Error("Mitgliedschaft nicht gefunden.");

  const today = new Date().toISOString().slice(0, 10);
  const { error: mErr } = await admin
    .from("memberships")
    .update({
      status: "active",
      start_date: membership.start_date || today,
    })
    .eq("id", membership.id);
  if (mErr) throw new Error(mErr.message);

  const fullProfile = await admin
    .from("profiles")
    .select("email,first_name,gender,no_app_access")
    .eq("id", userId)
    .maybeSingle();
  let profile = fullProfile.data as {
    email: string | null;
    first_name: string | null;
    gender: string | null;
    no_app_access?: boolean | null;
  } | null;
  if (fullProfile.error && /no_app_access|does not exist/i.test(fullProfile.error.message)) {
    const fb = await admin
      .from("profiles")
      .select("email,first_name,gender")
      .eq("id", userId)
      .maybeSingle();
    profile = fb.data ? { ...fb.data, no_app_access: false } : null;
  }
  const noApp = Boolean(profile?.no_app_access);

  if (!noApp && isRealMemberEmail(profile?.email)) {
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  await logMemberActivity({
    userId,
    eventType: MEMBER_ACTIVITY_TYPES.membershipApproved,
    title: "Mitgliedschaft freigegeben",
    details: `Mitgliedsnummer ${assignedNumber}. Status: aktiv (Zahlungseingang).`,
    linkUrl: base ? `${base}/admin/members` : null,
    linkLabel: "Mitgliederliste",
    createdBy,
  }).catch(console.error);

  let inviteEmailOk: boolean | null = null;
  if (!noApp && isRealMemberEmail(profile?.email)) {
    const mail = await sendMemberInviteAfterApproval({
      email: profile.email,
      firstName: profile.first_name?.trim() || "Fan",
      membershipNumber: assignedNumber,
      gender: profile.gender,
      userId,
    }).catch((e) => {
      console.error("[membership] Freischaltungs-Mail fehlgeschlagen:", e);
      return { ok: false as const, error: e instanceof Error ? e.message : "send failed" };
    });
    inviteEmailOk = mail.ok;
  }

  return { assignedNumber, inviteEmailOk };
}

/**
 * Nach bestätigtem Erstbeitrag: Antragsteller/innen automatisch aufnehmen
 * (Status aktiv + nächste Mitgliedsnummer). Bestehende Mitglieder bleiben unberührt.
 */
export async function activatePendingMembershipAfterFeePaid(
  admin: AdminClient,
  input: {
    userId: string;
    applicationId?: string | null;
    createdBy?: string;
  },
): Promise<{
  activated: boolean;
  assignedNumber?: string;
  inviteEmailOk?: boolean | null;
}> {
  const { data: membership } = await admin
    .from("memberships")
    .select("id,status")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership?.id || membership.status !== "applied") {
    return { activated: false };
  }

  let applicationId = input.applicationId ?? null;
  if (!applicationId) {
    const { data: app } = await admin
      .from("membership_applications")
      .select("id,status")
      .eq("user_id", input.userId)
      .in("status", ["submitted", "reviewed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    applicationId = app?.id ?? null;
  }

  if (applicationId) {
    const result = await activateApplication(admin, applicationId, undefined, input.createdBy);
    return {
      activated: true,
      assignedNumber: result.assignedNumber,
      inviteEmailOk: result.inviteEmailOk,
    };
  }

  const result = await activatePaperApplicant(admin, input.userId, input.createdBy);
  return {
    activated: true,
    assignedNumber: result.assignedNumber,
    inviteEmailOk: result.inviteEmailOk,
  };
}
