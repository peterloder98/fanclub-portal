"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildHtmlFromPlain } from "@/lib/email/build-html-from-plain";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import { loadSignaturePickerData } from "@/lib/email/draft-with-signatures";
import { CLUB_SIGNATURE_ID } from "@/lib/email/signatures";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import {
  logMemberActivity,
  MEMBER_ACTIVITY_TYPES,
} from "@/lib/membership/activity-log";
import {
  formatEur,
  LEDGER_CATEGORY_LABELS,
  listClubLedger,
  type LedgerCategory,
  type LedgerEntryType,
} from "@/lib/club/ledger";
import { includeInAccountingForCategory } from "@/lib/club/accounting-settings";
import {
  formatContributionEmailVars,
  getMemberContributionYears,
  listOpenContributions,
  pickPrimaryContribution,
  resolveMemberPaymentReference,
} from "@/lib/club/membership-contribution";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";
import { formatApplicationPaymentReference } from "@/lib/payments/club-bank";
import { buildMemberApplicationPaymentDraft } from "@/lib/email/application-payment-draft";
import { userFacingActionError } from "@/lib/admin/user-facing-action-error";
import { logAdminAction } from "@/lib/admin/audit-log";
import { MEMBER_BOARD_NOTE_MAX } from "@/lib/members/board-notes";
import {
  loadPaymentMailProfile,
  resolvePaymentEmail,
} from "@/lib/members/no-app-access";
import {
  listOpenMeetingCharges,
  markMeetingChargePaid,
} from "@/lib/club/meeting-charges";
import { syncMemberContributionDate } from "@/lib/club/contribution-sync";
import { activatePendingMembershipAfterFeePaid } from "@/lib/membership/activate-application";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { buildLedgerCsv } from "@/lib/club/ledger-export";
import {
  memberHasAutomaticMembershipPaymentBooking,
  MEMBERSHIP_LEDGER_DUPLICATE_HINT,
} from "@/lib/membership/membership-ledger-guard";

export async function revokeMemberWarning(warningId: string) {
  const { user, profile: adminProfile } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: warning, error: wErr } = await admin
    .from("member_warnings")
    .select("id,member_id,comment_text,context_title,context_kind,created_at")
    .eq("id", warningId)
    .maybeSingle();
  if (wErr) throw new Error(wErr.message);
  if (!warning) throw new Error("Verwarnung nicht gefunden.");

  const { data: member, error: mErr } = await admin
    .from("profiles")
    .select("id,first_name,last_name,warning_count")
    .eq("id", warning.member_id)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!member) throw new Error("Mitglied nicht gefunden.");

  const { data: deleted, error: delErr } = await admin
    .from("member_warnings")
    .delete()
    .eq("id", warningId)
    .select("id");
  if (delErr) throw new Error(delErr.message);
  if (!deleted?.length) {
    throw new Error("Verwarnung konnte nicht gelöscht werden (nicht gefunden).");
  }

  const { count, error: countErr } = await admin
    .from("member_warnings")
    .select("*", { count: "exact", head: true })
    .eq("member_id", member.id);
  if (countErr) throw new Error(countErr.message);
  const newCount = count ?? 0;

  const { error: upErr } = await admin
    .from("profiles")
    .update({ warning_count: newCount })
    .eq("id", member.id);
  if (upErr) throw new Error(upErr.message);

  const adminName =
    `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";
  const snippet =
    warning.comment_text.length > 120
      ? `${warning.comment_text.slice(0, 120)}…`
      : warning.comment_text;

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  await createUserNotification({
    userId: member.id,
    kind: NOTIFICATION_KINDS.warningRevoked,
    title: "Verwarnung zurückgenommen",
    body: `Eine Verwarnung wurde zurückgenommen. Verbleibend: ${newCount}.`,
    linkUrl: base ? `${base}/profile` : "/profile",
    linkLabel: "Mein Profil",
  }).catch(console.error);

  await logMemberActivity({
    userId: member.id,
    eventType: MEMBER_ACTIVITY_TYPES.warningRevoked,
    title: "Verwarnung zurückgenommen",
    details: `Kommentar „${snippet}" unter „${warning.context_title ?? "—"}" wurde von ${adminName} zurückgenommen. Verbleibend: ${newCount}.`,
    createdBy: user.id,
    metadata: { warning_id: warningId, warning_count: newCount },
  }).catch((e) => console.error("[members] revoke warning log:", e));

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${member.id}`);
  revalidatePath("/profile");
  return { ok: true, warningCount: newCount };
}

export async function getMemberPaymentReminderDraft(
  userId: string,
  signatureId?: string,
  calendarYear?: number,
) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const profile = await loadPaymentMailProfile(admin, userId);
  const to = profile ? resolvePaymentEmail(profile) : null;
  if (!profile || !to) throw new Error("Keine E-Mail für Beitragszahlungen hinterlegt.");

  const { data: membership } = await admin
    .from("memberships")
    .select("fee_cents")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { signatures, defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const useSignatureId = signatureId ?? defaultSignatureId;
  const allYears = await getMemberContributionYears(userId);
  const contrib = calendarYear
    ? allYears.find((y) => y.calendarYear === calendarYear) ?? null
    : pickPrimaryContribution(allYears);
  const feeEur = `${((membership?.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const contribVars = contrib
    ? formatContributionEmailVars(contrib)
    : {
        fee_eur: feeEur,
        fee_paid_eur: "0,00 €",
        fee_open_eur: feeEur.replace(" EUR", " €"),
        membership_period: String(calendarYear ?? new Date().getFullYear()),
        payment_reference: "",
        due_date: "",
        payment_deadline: "",
        contribution_year: String(calendarYear ?? new Date().getFullYear()),
      };

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: profile.first_name?.trim() || "Fan",
      gender: profile.gender ?? "",
      last_name: profile.last_name?.trim() || "",
      applicant_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      email: to,
      fee_eur: contribVars.fee_eur,
      fee_paid_eur: contribVars.fee_paid_eur,
      fee_open_eur: contribVars.fee_open_eur,
      ...clubBankEmailVars(),
      bank_reference: resolveMemberPaymentReference({
        calendarYear: calendarYear ?? contrib?.calendarYear ?? new Date().getFullYear(),
        membershipNumber: profile.membership_number,
        firstName: profile.first_name,
        lastName: profile.last_name,
        fromContribution: contribVars.payment_reference,
      }),
    },
    { signatureId: useSignatureId },
  );

  return {
    subject: rendered.subject,
    body: rendered.text,
    to,
    signatures,
    defaultSignatureId: useSignatureId,
    signatureTexts,
  };
}

export async function sendMemberPaymentReminderEmail(input: {
  userId: string;
  subject: string;
  body: string;
  signatureId: string;
  calendarYear?: number;
}) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const profile = await loadPaymentMailProfile(admin, input.userId);
  const to = profile ? resolvePaymentEmail(profile) : null;
  if (!profile || !to) throw new Error("Keine E-Mail für Beitragszahlungen hinterlegt.");

  const { data: membership } = await admin
    .from("memberships")
    .select("fee_cents")
    .eq("user_id", input.userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const allYears = await getMemberContributionYears(input.userId);
  const contrib = input.calendarYear
    ? allYears.find((y) => y.calendarYear === input.calendarYear) ?? null
    : pickPrimaryContribution(allYears);
  const feeEur = `${((membership?.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const contribVars = contrib
    ? formatContributionEmailVars(contrib)
    : {
        fee_eur: feeEur,
        fee_paid_eur: "0,00 €",
        fee_open_eur: feeEur.replace(" EUR", " €"),
        membership_period: String(input.calendarYear ?? new Date().getFullYear()),
        payment_reference: "",
        due_date: "",
        payment_deadline: "",
        contribution_year: String(input.calendarYear ?? new Date().getFullYear()),
      };
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: profile.first_name?.trim() || "Fan",
      gender: profile.gender ?? "",
      last_name: profile.last_name?.trim() || "",
      applicant_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      email: to,
      fee_eur: contribVars.fee_eur,
      fee_paid_eur: contribVars.fee_paid_eur,
      fee_open_eur: contribVars.fee_open_eur,
      membership_period: contribVars.membership_period,
      ...clubBankEmailVars(),
      bank_reference: resolveMemberPaymentReference({
        calendarYear: input.calendarYear ?? contrib?.calendarYear ?? new Date().getFullYear(),
        membershipNumber: profile.membership_number,
        firstName: profile.first_name,
        lastName: profile.last_name,
        fromContribution: contribVars.payment_reference,
      }),
    },
    { signatureId: input.signatureId || CLUB_SIGNATURE_ID },
  );

  const attachments = rendered.signatureAttachment
    ? [
        {
          filename: rendered.signatureAttachment.filename,
          content: Buffer.from(rendered.signatureAttachment.content),
          contentType: rendered.signatureAttachment.contentType,
          cid: rendered.signatureAttachment.cid,
        },
      ]
    : undefined;

  const subject = input.subject.trim() || rendered.subject;
  const text = input.body.trim() || rendered.text;
  const html = input.body.trim()
    ? buildHtmlFromPlain(text, rendered.signatureHtml, rendered.signatureText)
    : rendered.html;

  const result = await sendEmailViaAccount({
    to,
    subject,
    text,
    html,
    attachments,
    // Vorstands-Zahlungsmails an Antragsteller/Mitglieder: auch wenn Env noch auf test steht
    bypassTestAllowlist: true,
  });

  if (!result.ok) {
    if (result.skipped) {
      const reason = "reason" in result ? String(result.reason) : "";
      if (reason.includes("outbound_test_mode")) {
        throw new Error(
          "E-Mail blockiert: Empfänger nicht freigegeben. Bitte in Vercel EMAIL_OUTBOUND_MODE=live setzen (Go-Live ist vorbei).",
        );
      }
      throw new Error(
        "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).",
      );
    }
    throw new Error("E-Mail konnte nicht gesendet werden (SMTP prüfen).");
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  await logMemberActivity({
    userId: profile.id,
    eventType: MEMBER_ACTIVITY_TYPES.paymentReminderSent,
    title: "Zahlungserinnerung per E-Mail gesendet",
    details: `Betreff: ${subject}${contrib?.openCents ? ` · Offen: ${formatEur(contrib.openCents)}` : ""}`,
    linkUrl: base ? `${base}/admin/members/${profile.id}` : null,
    linkLabel: "Mitgliedsdatensatz",
    createdBy: user.id,
    metadata: {
      signature_id: input.signatureId,
      fee_open_cents: contrib?.openCents ?? null,
      membership_period: contrib?.periodLabel ?? null,
      calendar_year: contrib?.calendarYear ?? input.calendarYear ?? null,
    },
  }).catch((e) => console.error("[activity] Zahlungserinnerung:", e));

  revalidatePath(`/admin/members/${profile.id}`);
  revalidatePath("/admin/members");
  return { ok: true };
}

/**
 * Vorlage „Antrag eingegangen + bitte zahlen“ — für manuell erfasste Papier-Anträge
 * (kein App-Zugangslink, nur Beitragsinfo; VWZ wie Online-Antrag).
 * Fehler als Rückgabewert (kein throw) — sonst undurchsichtige Digests in Production.
 */
export async function getMemberApplicationPaymentDraft(
  userId: string,
  signatureId?: string,
): Promise<
  | {
      ok: true;
      subject: string;
      body: string;
      to: string;
      signatures: Awaited<ReturnType<typeof loadSignaturePickerData>>["signatures"];
      defaultSignatureId: string;
      signatureTexts: Record<string, string>;
    }
  | { ok: false; error: string }
> {
  try {
    await requireAdminAction();
    const draft = await buildMemberApplicationPaymentDraft(userId, signatureId);
    return {
      ok: true,
      subject: draft.subject,
      body: draft.body,
      to: draft.to,
      signatures: draft.signatures,
      defaultSignatureId: draft.defaultSignatureId,
      signatureTexts: draft.signatureTexts,
    };
  } catch (e) {
    console.error("[members] Antrags-Zahlungsinfo-Vorlage:", e);
    return {
      ok: false,
      error: userFacingActionError(
        e,
        "Vorlage „Antrag / Zahlungsinfo“ konnte nicht geladen werden. Bitte Seite neu laden oder erneut auf „Zahlungsinfo senden“ tippen.",
      ),
    };
  }
}

export async function sendMemberApplicationPaymentEmail(input: {
  userId: string;
  subject: string;
  body: string;
  signatureId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdminAction();
    const admin = createSupabaseAdminClient();
    const profile = await loadPaymentMailProfile(admin, input.userId);
    const to = profile ? resolvePaymentEmail(profile) : null;
    if (!profile || !to) throw new Error("Keine E-Mail für Beitragszahlungen hinterlegt.");

    const { data: membership } = await admin
      .from("memberships")
      .select("fee_cents")
      .eq("user_id", input.userId)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const feeEur = `${((membership?.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
    const bankReference = formatApplicationPaymentReference(
      profile.first_name ?? "",
      profile.last_name ?? "",
    );

    const rendered = await renderEmailFromTemplate(
      EMAIL_TEMPLATE_KEYS.membershipApplicationReceived,
      {
        first_name: profile.first_name?.trim() || "Fan",
        gender: profile.gender ?? "",
        last_name: profile.last_name?.trim() || "",
        applicant_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
        email: to,
        fee_eur: feeEur,
        ...clubBankEmailVars({ bankReference }),
      },
      { signatureId: input.signatureId || CLUB_SIGNATURE_ID },
    );

    const attachments = rendered.signatureAttachment
      ? [
          {
            filename: rendered.signatureAttachment.filename,
            content: Buffer.from(rendered.signatureAttachment.content),
            contentType: rendered.signatureAttachment.contentType,
            cid: rendered.signatureAttachment.cid,
          },
        ]
      : undefined;

    const subject = input.subject.trim() || rendered.subject;
    const text = input.body.trim() || rendered.text;
    const html = input.body.trim()
      ? buildHtmlFromPlain(text, rendered.signatureHtml, rendered.signatureText)
      : rendered.html;

    const result = await sendEmailViaAccount({
      to,
      subject,
      text,
      html,
      attachments,
      bypassTestAllowlist: true,
    });

    if (!result.ok) {
      if (result.skipped) {
        const reason = "reason" in result ? String(result.reason) : "";
        if (reason.includes("outbound_test_mode")) {
          return {
            ok: false,
            error:
              "E-Mail blockiert: Empfänger nicht freigegeben. Bitte in Vercel EMAIL_OUTBOUND_MODE=live setzen (Go-Live ist vorbei).",
          };
        }
        return {
          ok: false,
          error:
            "E-Mail konnte nicht gesendet werden: Kein SMTP-Konto hinterlegt (Admin → E-Mail / SMTP).",
        };
      }
      return { ok: false, error: "E-Mail konnte nicht gesendet werden (SMTP prüfen)." };
    }

    const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
    await logMemberActivity({
      userId: profile.id,
      eventType: MEMBER_ACTIVITY_TYPES.paymentReminderSent,
      title: "Antrags-/Zahlungsinfo per E-Mail gesendet",
      details: `Betreff: ${subject} · VWZ: ${bankReference}`,
      linkUrl: base ? `${base}/admin/members/${profile.id}` : null,
      linkLabel: "Mitgliedsdatensatz",
      createdBy: user.id,
      metadata: {
        signature_id: input.signatureId,
        kind: "application_payment_info",
        bank_reference: bankReference,
      },
    }).catch((e) => console.error("[activity] Antrags-Zahlungsinfo:", e));

    revalidatePath(`/admin/members/${profile.id}`);
    revalidatePath("/admin/members");
    return { ok: true };
  } catch (e) {
    console.error("[members] Antrags-Zahlungsinfo senden:", e);
    return {
      ok: false,
      error: userFacingActionError(
        e,
        "Zahlungsinfo konnte nicht gesendet werden. Bitte erneut versuchen oder SMTP prüfen.",
      ),
    };
  }
}

export async function suspendMemberAppAccess(input: { userId: string; reason?: string }) {
  const { user, profile: adminProfile } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: membership, error: mErr } = await admin
    .from("memberships")
    .select("id,status,user_id")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!membership) throw new Error("Mitgliedschaft nicht gefunden.");
  if (membership.status !== "active") {
    throw new Error("Nur aktive Mitglieder können vorübergehend gesperrt werden.");
  }

  const reason = input.reason?.trim() || "Bitte wende dich an den Vorstand.";
  const { error: updErr } = await admin
    .from("memberships")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    })
    .eq("id", membership.id);
  if (updErr) throw new Error(updErr.message);

  const adminName =
    `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";

  await logMemberActivity({
    userId: input.userId,
    eventType: MEMBER_ACTIVITY_TYPES.appAccessSuspended,
    title: "App-Zugang vorübergehend gesperrt",
    details: `${adminName}: ${reason}`,
    createdBy: user.id,
  }).catch(console.error);

  revalidatePath(`/admin/members/${input.userId}`);
  revalidatePath("/admin/members");
  return { ok: true };
}

export async function reactivateMemberAppAccess(userId: string) {
  const { user, profile: adminProfile } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { data: membership, error: mErr } = await admin
    .from("memberships")
    .select("id,status,user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mErr) throw new Error(mErr.message);
  if (!membership) throw new Error("Mitgliedschaft nicht gefunden.");
  if (membership.status !== "suspended") {
    throw new Error("Nur gesperrte Mitglieder können wieder freigeschaltet werden.");
  }

  const { error: updErr } = await admin
    .from("memberships")
    .update({
      status: "active",
      suspended_at: null,
      suspension_reason: null,
    })
    .eq("id", membership.id);
  if (updErr) throw new Error(updErr.message);

  const adminName =
    `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";

  await logMemberActivity({
    userId,
    eventType: MEMBER_ACTIVITY_TYPES.appAccessReactivated,
    title: "App-Zugang wieder freigeschaltet",
    details: `Freischaltung durch ${adminName}.`,
    createdBy: user.id,
  }).catch(console.error);

  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  return { ok: true };
}

/** App-Zugang als gelöscht markieren (Registrierungsstatus), ohne das Mitglied zu löschen. */
export async function markMemberAppRegistrationDeleted(userId: string) {
  const { user, profile: adminProfile } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const nowIso = new Date().toISOString();
  const { error: updErr } = await admin
    .from("profiles")
    .update({
      app_registration_status: "deleted",
      app_registration_deleted_at: nowIso,
    })
    .eq("id", userId);
  if (updErr) throw new Error(updErr.message);

  const adminName =
    `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";

  await logMemberActivity({
    userId,
    eventType: MEMBER_ACTIVITY_TYPES.appRegistrationDeleted,
    title: "App-Registrierung als gelöscht markiert",
    details: `Markiert durch ${adminName}.`,
    createdBy: user.id,
  }).catch(console.error);

  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  return { ok: true };
}

/** Begrüßungspost (manuell per Post): Datum setzen oder auf offen zurücksetzen. */
export async function setMemberGreetingPostSentAt(
  userId: string,
  sentOn: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, profile: adminProfile } = await requireAdminAction();
    const admin = createSupabaseAdminClient();

    let value: string | null = null;
    if (sentOn?.trim()) {
      const raw = sentOn.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return { ok: false, error: "Bitte ein gültiges Datum wählen (TT.MM.JJJJ)." };
      }
      value = raw;
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({ greeting_post_sent_at: value })
      .eq("id", userId);
    if (updErr) {
      if (/greeting_post_sent_at|does not exist/i.test(updErr.message)) {
        return {
          ok: false,
          error:
            "Datenbank-Spalte fehlt. Bitte supabase/149_greeting_post_sent_at.sql im SQL-Editor ausführen.",
        };
      }
      return { ok: false, error: updErr.message };
    }

    const adminName =
      `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";

    if (value) {
      const label = new Date(`${value}T12:00:00`).toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      await logMemberActivity({
        userId,
        eventType: MEMBER_ACTIVITY_TYPES.greetingPostSent,
        title: "Begrüßungspost vermerkt",
        details: `Versendet am ${label} (eingetragen von ${adminName}).`,
        createdBy: user.id,
      }).catch(console.error);
    } else {
      await logMemberActivity({
        userId,
        eventType: MEMBER_ACTIVITY_TYPES.greetingPostCleared,
        title: "Begrüßungspost zurückgesetzt",
        details: `Status wieder „offen“ (durch ${adminName}).`,
        createdBy: user.id,
      }).catch(console.error);
    }

    revalidatePath(`/admin/members/${userId}`);
    revalidatePath("/admin/members");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: userFacingActionError(e, "Begrüßungspost konnte nicht gespeichert werden."),
    };
  }
}

export async function saveMemberBoardNote(
  userId: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user } = await requireAdminAction();
    const admin = createSupabaseAdminClient();
    const trimmed = note.trim();
    if (trimmed.length > MEMBER_BOARD_NOTE_MAX) {
      return { ok: false, error: `Maximal ${MEMBER_BOARD_NOTE_MAX} Zeichen.` };
    }

    if (!trimmed) {
      const { error: delErr } = await admin.from("member_board_notes").delete().eq("user_id", userId);
      if (delErr) {
        if (/member_board_notes|does not exist/i.test(delErr.message)) {
          return {
            ok: false,
            error:
              "Datenbank-Tabelle fehlt. Bitte supabase/152_member_board_notes.sql im SQL-Editor ausführen.",
          };
        }
        return { ok: false, error: delErr.message };
      }
      await logAdminAction(admin, {
        actorId: user.id,
        action: "member.board_note.clear",
        entityType: "profile",
        entityId: userId,
        summary: "Interne Bemerkung entfernt",
      });
    } else {
      const { error: upErr } = await admin.from("member_board_notes").upsert(
        {
          user_id: userId,
          note: trimmed,
          updated_by: user.id,
        },
        { onConflict: "user_id" },
      );
      if (upErr) {
        if (/member_board_notes|does not exist/i.test(upErr.message)) {
          return {
            ok: false,
            error:
              "Datenbank-Tabelle fehlt. Bitte supabase/152_member_board_notes.sql im SQL-Editor ausführen.",
          };
        }
        return { ok: false, error: upErr.message };
      }
      await logAdminAction(admin, {
        actorId: user.id,
        action: "member.board_note.save",
        entityType: "profile",
        entityId: userId,
        summary: "Interne Bemerkung gespeichert",
      });
    }

    revalidatePath(`/admin/members/${userId}`);
    revalidatePath("/admin/members");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: userFacingActionError(e, "Bemerkung konnte nicht gespeichert werden."),
    };
  }
}

/** Beitrag schon bestätigt, Aufnahme aber noch nicht gelaufen (z. B. vor der Automatik). */
export async function admitPendingMemberAfterFeePaid(userId: string) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const admission = await activatePendingMembershipAfterFeePaid(admin, {
    userId,
    createdBy: user.id,
  });
  if (!admission.activated) {
    throw new Error(
      "Keine offene Mitgliedschaft zum Aufnehmen. Beitrag muss bestätigt sein und der Status „Mitgliedschaft beantragt“.",
    );
  }
  await logAdminAction(admin, {
    actorId: user.id,
    action: "membership.admit_after_fee",
    entityType: "profile",
    entityId: userId,
    summary: `Mitglied aufgenommen${admission.assignedNumber ? ` (Nr. ${admission.assignedNumber})` : ""} nach bestätigtem Beitrag`,
    metadata: {
      assigned_number: admission.assignedNumber,
      invite_email_ok: admission.inviteEmailOk,
    },
  });
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  revalidatePath("/admin/payments");
  return {
    ok: true as const,
    assignedNumber: admission.assignedNumber ?? null,
    inviteEmailOk: admission.inviteEmailOk ?? null,
  };
}

/** Registrierungsstatus zurücksetzen auf „Offen“ (z. B. nach Neu-Einladung). */
export async function clearMemberAppRegistration(userId: string) {
  const { user, profile: adminProfile } = await requireAdminAction();
  const admin = createSupabaseAdminClient();

  const { error: updErr } = await admin
    .from("profiles")
    .update({
      app_registration_status: "open",
      app_registered_at: null,
      app_registration_deleted_at: null,
    })
    .eq("id", userId);
  if (updErr) throw new Error(updErr.message);

  const adminName =
    `${adminProfile.first_name ?? ""} ${adminProfile.last_name ?? ""}`.trim() || "Admin";

  await logMemberActivity({
    userId,
    eventType: MEMBER_ACTIVITY_TYPES.appRegistrationCleared,
    title: "App-Registrierung zurückgesetzt",
    details: `Zurückgesetzt auf „Offen“ durch ${adminName}.`,
    createdBy: user.id,
  }).catch(console.error);

  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
  return { ok: true };
}

const ledgerSchema = z.object({
  entryType: z.enum(["income", "expense"]),
  amountEur: z.coerce.number().positive(),
  description: z.string().min(1),
  category: z.enum(["membership", "merchandise", "event", "general", "other"]),
  memberId: z.string().uuid().optional().nullable(),
  entryDate: z.string().min(1),
});

export async function fetchOpenContributionsAction() {
  await requireAdminAction();
  return listOpenContributions();
}

export async function fetchOpenMeetingChargesAction() {
  await requireAdminAction();
  return listOpenMeetingCharges();
}

export async function attachReceiptToLedgerEntry(entryId: string, storagePath: string) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("club_ledger_entries")
    .update({ receipt_storage_path: storagePath })
    .eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/accounting");
  return { ok: true };
}

export async function addClubLedgerEntry(input: {
  entryType: LedgerEntryType;
  amountEur: number;
  description: string;
  category: LedgerCategory;
  memberId?: string | null;
  entryDate: string;
  receiptStoragePath?: string | null;
  meetingId?: string | null;
}) {
  const { user } = await requireAdminAction();
  const parsed = ledgerSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const amountCents = Math.round(parsed.amountEur * 100);

  if (
    parsed.category === "membership" &&
    parsed.entryType === "income" &&
    parsed.memberId
  ) {
    const hasPaymentBooking = await memberHasAutomaticMembershipPaymentBooking(
      admin,
      parsed.memberId,
    );
    if (hasPaymentBooking) {
      throw new Error(MEMBERSHIP_LEDGER_DUPLICATE_HINT);
    }
  }

  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");

  const { data: row, error } = await admin
    .from("club_ledger_entries")
    .insert({
      entry_type: parsed.entryType,
      amount_cents: amountCents,
      description: parsed.description.trim(),
      category: parsed.category,
      member_id: parsed.memberId ?? null,
      entry_date: parsed.entryDate,
      created_by: user.id,
      receipt_storage_path: input.receiptStoragePath ?? null,
      include_in_accounting: includeInAccountingForCategory(parsed.category),
    })
    .select("id,entry_number")
    .single();
  if (error) {
    if (/club_ledger_entries|does not exist/i.test(error.message)) {
      throw new Error(
        "Buchhaltungs-Tabelle fehlt. Bitte supabase/049_club_ledger.sql im SQL Editor ausführen.",
      );
    }
    throw new Error(error.message);
  }

  const entryNumber = (row as { entry_number?: string | null } | null)?.entry_number ?? null;

  const label = LEDGER_CATEGORY_LABELS[parsed.category];
  const amountLabel = formatEur(amountCents);
  const eventType =
    parsed.entryType === "income"
      ? MEMBER_ACTIVITY_TYPES.ledgerIncome
      : MEMBER_ACTIVITY_TYPES.ledgerExpense;

  if (parsed.memberId && row?.id) {
    const activityId = await logMemberActivity({
      userId: parsed.memberId,
      eventType:
        parsed.category === "membership" && parsed.entryType === "income"
          ? MEMBER_ACTIVITY_TYPES.paymentReceived
          : eventType,
      title:
        parsed.entryType === "income"
          ? `Einnahme: ${amountLabel}`
          : `Ausgabe: ${amountLabel}`,
      details: `${label}: ${parsed.description.trim()}${input.receiptStoragePath ? " · Beleg hinterlegt" : ""}`,
      linkUrl: base ? `${base}/admin/accounting` : null,
      linkLabel: "Buchhaltung",
      createdBy: user.id,
      metadata: {
        ledger_entry_id: row.id,
        entry_number: entryNumber,
        amount_cents: amountCents,
        category: parsed.category,
        receipt_storage_path: input.receiptStoragePath ?? null,
      },
    }).catch((e) => {
      console.error("[ledger] activity log:", e);
      return null;
    });

    if (activityId) {
      await admin
        .from("club_ledger_entries")
        .update({ activity_log_id: activityId })
        .eq("id", row.id);
    }

    if (parsed.category === "membership" && parsed.entryType === "income") {
      await syncMemberContributionDate(admin, parsed.memberId).catch(console.error);
      await createUserNotification({
        userId: parsed.memberId,
        kind: NOTIFICATION_KINDS.paymentReceived,
        title: "Zahlungseingang verzeichnet",
        body: `Mitgliedsbeitrag ${amountLabel} wurde verbucht.`,
        linkUrl: base ? `${base}/profile` : "/profile",
        linkLabel: "Mein Profil",
        metadata: {
          ledger_entry_id: row.id,
          entry_number: entryNumber,
          amount_cents: amountCents,
        },
      }).catch(console.error);
    }

    if (
      input.meetingId &&
      parsed.entryType === "income" &&
      parsed.category === "event" &&
      row?.id
    ) {
      await markMeetingChargePaid(admin, input.meetingId, parsed.memberId, row.id).catch(
        console.error,
      );
      await createUserNotification({
        userId: parsed.memberId,
        kind: NOTIFICATION_KINDS.paymentReceived,
        title: "Zahlung Fanclub-Treffen verbucht",
        body: `${parsed.description.trim()} — ${amountLabel}`,
        linkUrl: base ? `${base}/treffen/${input.meetingId}` : `/treffen/${input.meetingId}`,
        linkLabel: "Zum Treffen",
        metadata: {
          ledger_entry_id: row.id,
          entry_number: entryNumber,
          meeting_id: input.meetingId,
        },
      }).catch(console.error);
    }
  }

  revalidatePath("/admin/accounting");
  if (parsed.memberId) revalidatePath(`/admin/members/${parsed.memberId}`);
  return { ok: true };
}

export async function fetchClubLedger(memberId?: string | null) {
  await requireAdminAction();
  return listClubLedger({ memberId, limit: memberId ? 50 : 200 });
}

const ledgerUpdateSchema = ledgerSchema.extend({
  entryId: z.string().uuid(),
});

export async function updateClubLedgerEntry(input: {
  entryId: string;
  entryType: LedgerEntryType;
  amountEur: number;
  description: string;
  category: LedgerCategory;
  entryDate: string;
  memberId?: string | null;
  receiptStoragePath?: string | null;
}) {
  const { user } = await requireAdminAction();
  const parsed = ledgerUpdateSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const amountCents = Math.round(parsed.amountEur * 100);

  const { data: existing, error: loadErr } = await admin
    .from("club_ledger_entries")
    .select("id,member_id,activity_log_id,amount_cents,entry_date,entry_type,category")
    .eq("id", parsed.entryId)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error("Eintrag nicht gefunden.");

  const { error } = await admin
    .from("club_ledger_entries")
    .update({
      entry_type: parsed.entryType,
      amount_cents: amountCents,
      description: parsed.description.trim(),
      category: parsed.category,
      entry_date: parsed.entryDate,
      member_id: parsed.memberId ?? existing.member_id,
      receipt_storage_path: input.receiptStoragePath ?? undefined,
    })
    .eq("id", parsed.entryId);
  if (error) throw new Error(error.message);

  const label = LEDGER_CATEGORY_LABELS[parsed.category];
  const amountLabel = formatEur(amountCents);
  const eventType =
    parsed.entryType === "income"
      ? MEMBER_ACTIVITY_TYPES.ledgerIncome
      : MEMBER_ACTIVITY_TYPES.ledgerExpense;

  if (existing.activity_log_id) {
    const title =
      parsed.entryType === "income"
        ? `Einnahme: ${amountLabel}`
        : `Ausgabe: ${amountLabel}`;
    const details = `${label}: ${parsed.description.trim()}${
      input.receiptStoragePath ? " · Beleg hinterlegt" : ""
    }`;
    await admin
      .from("member_activity_log")
      .update({
        event_type:
          parsed.category === "membership" && parsed.entryType === "income"
            ? MEMBER_ACTIVITY_TYPES.paymentReceived
            : eventType,
        title,
        details,
        metadata: {
          ledger_entry_id: parsed.entryId,
          amount_cents: amountCents,
          category: parsed.category,
        },
      })
      .eq("id", existing.activity_log_id)
      .then(({ error: actErr }) => {
        if (actErr) console.error("[ledger] activity sync:", actErr);
      });
  } else if (existing.member_id) {
    const activityId = await logMemberActivity({
      userId: existing.member_id,
      eventType:
        parsed.category === "membership" && parsed.entryType === "income"
          ? MEMBER_ACTIVITY_TYPES.paymentReceived
          : eventType,
      title:
        parsed.entryType === "income"
          ? `Einnahme: ${amountLabel}`
          : `Ausgabe: ${amountLabel}`,
      details: `${label}: ${parsed.description.trim()} (bearbeitet)`,
      createdBy: user.id,
      metadata: {
        ledger_entry_id: parsed.entryId,
        amount_cents: amountCents,
        category: parsed.category,
      },
    }).catch(() => null);
    if (activityId) {
      await admin
        .from("club_ledger_entries")
        .update({ activity_log_id: activityId })
        .eq("id", parsed.entryId);
    }
  }

  if (
    existing.member_id &&
    parsed.category === "membership" &&
    parsed.entryType === "income"
  ) {
    await syncMemberContributionDate(admin, existing.member_id).catch(console.error);
  }

  revalidatePath("/admin/accounting");
  if (existing.member_id) revalidatePath(`/admin/members/${existing.member_id}`);
  return { ok: true };
}

export async function deleteClubLedgerEntry(entryId: string) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("club_ledger_entries")
    .select("id,member_id,description,amount_cents,entry_type,category")
    .eq("id", entryId)
    .maybeSingle();

  const { error } = await admin.from("club_ledger_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);

  if (row?.member_id && row.category === "membership" && row.entry_type === "income") {
    await syncMemberContributionDate(admin, row.member_id).catch(console.error);
  }

  if (row?.member_id) {
    await logMemberActivity({
      userId: row.member_id,
      eventType: MEMBER_ACTIVITY_TYPES.note,
      title: "Buchhaltungseintrag gelöscht",
      details: `${row.entry_type === "income" ? "Einnahme" : "Ausgabe"} ${formatEur(row.amount_cents)}: ${row.description}`,
      createdBy: user.id,
    }).catch(() => {});
    revalidatePath(`/admin/members/${row.member_id}`);
  }
  revalidatePath("/admin/accounting");
  return { ok: true };
}

export async function exportClubLedgerCsvAction(opts?: {
  mode?: "all" | "paid" | "open";
}) {
  await requireAdminAction();
  const rows = await listClubLedger({ limit: 5000 });
  const mode = opts?.mode ?? "paid";
  const csv =
    mode === "open"
      ? buildLedgerCsv(rows, { openOnly: true })
      : mode === "paid"
        ? buildLedgerCsv(rows, { paidOnly: true })
        : buildLedgerCsv(rows);
  const suffix =
    mode === "open" ? "offene-posten" : mode === "paid" ? "bestaetigt" : "gesamt";
  return {
    csv,
    filename: `buchhaltung-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}
