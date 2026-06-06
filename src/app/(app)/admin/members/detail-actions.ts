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
import {
  formatContributionEmailVars,
  getMemberContributionInfo,
  listOpenContributions,
} from "@/lib/club/membership-contribution";
import {
  listOpenMeetingCharges,
  markMeetingChargePaid,
} from "@/lib/club/meeting-charges";
import { syncMemberContributionDate } from "@/lib/club/contribution-sync";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { buildLedgerCsv } from "@/lib/club/ledger-export";

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

  const { error: delErr } = await admin.from("member_warnings").delete().eq("id", warningId);
  if (delErr) throw new Error(delErr.message);

  const newCount = Math.max(0, (member.warning_count ?? 1) - 1);
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
  return { ok: true, warningCount: newCount };
}

export async function getMemberPaymentReminderDraft(userId: string, signatureId?: string) {
  await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile?.email) throw new Error("E-Mail des Mitglieds fehlt.");

  const { data: membership } = await admin
    .from("memberships")
    .select("fee_cents")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { signatures, defaultSignatureId, signatureTexts } = await loadSignaturePickerData();
  const useSignatureId = signatureId ?? defaultSignatureId;
  const contrib = await getMemberContributionInfo(userId);
  const feeEur = `${((membership?.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const contribVars = contrib
    ? formatContributionEmailVars(contrib)
    : {
        fee_eur: feeEur,
        fee_paid_eur: "0,00 €",
        fee_open_eur: feeEur.replace(" EUR", " €"),
        membership_period: String(new Date().getFullYear()),
      };

  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: profile.first_name?.trim() || "Fan",
      last_name: profile.last_name?.trim() || "",
      applicant_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      email: profile.email,
      fee_eur: contribVars.fee_eur,
      fee_paid_eur: contribVars.fee_paid_eur,
      fee_open_eur: contribVars.fee_open_eur,
      membership_period: contribVars.membership_period,
    },
    { signatureId: useSignatureId },
  );

  return {
    subject: rendered.subject,
    body: rendered.text,
    to: profile.email,
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
}) {
  const { user } = await requireAdminAction();
  const admin = createSupabaseAdminClient();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email")
    .eq("id", input.userId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile?.email) throw new Error("E-Mail des Mitglieds fehlt.");

  const { data: membership } = await admin
    .from("memberships")
    .select("fee_cents")
    .eq("user_id", input.userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const contrib = await getMemberContributionInfo(input.userId);
  const feeEur = `${((membership?.fee_cents ?? 1500) / 100).toFixed(2).replace(".", ",")} EUR`;
  const contribVars = contrib
    ? formatContributionEmailVars(contrib)
    : {
        fee_eur: feeEur,
        fee_paid_eur: "0,00 €",
        fee_open_eur: feeEur.replace(" EUR", " €"),
        membership_period: String(new Date().getFullYear()),
      };
  const rendered = await renderEmailFromTemplate(
    EMAIL_TEMPLATE_KEYS.membershipPaymentReminder,
    {
      first_name: profile.first_name?.trim() || "Fan",
      last_name: profile.last_name?.trim() || "",
      applicant_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      email: profile.email,
      fee_eur: contribVars.fee_eur,
      fee_paid_eur: contribVars.fee_paid_eur,
      fee_open_eur: contribVars.fee_open_eur,
      membership_period: contribVars.membership_period,
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
    ? buildHtmlFromPlain(text, rendered.html)
    : rendered.html;

  const result = await sendEmailViaAccount({
    to: profile.email,
    subject,
    text,
    html,
    attachments,
  });

  if (!result.ok) {
    if (result.skipped) {
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
    },
  }).catch((e) => console.error("[activity] Zahlungserinnerung:", e));

  revalidatePath(`/admin/members/${profile.id}`);
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
