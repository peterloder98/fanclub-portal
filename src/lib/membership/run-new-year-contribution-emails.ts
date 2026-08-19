import { formatEur } from "@/lib/club/ledger";
import {
  buildOpenContributionsBlock,
  computeMemberContributionYears,
  formatDueDateDe,
  formatMembershipPaymentReference,
  membershipLedgerRowCountsAsPaid,
  paymentDeadlineForContributionYear,
} from "@/lib/club/membership-contribution";
import { clubBankEmailVars } from "@/lib/email/club-bank-vars";
import { renderEmailFromTemplate } from "@/lib/email/render-template";
import { EMAIL_TEMPLATE_KEYS } from "@/lib/email/template-keys";
import { sendEmailViaAccount } from "@/lib/smtp/send-via-account";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePaymentEmail } from "@/lib/members/no-app-access";

const BERLIN_TZ = "Europe/Berlin";

export function berlinDateParts(ref = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(ref);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
  };
}

export function isNewYearContributionMailDay(ref = new Date()) {
  const { month, day } = berlinDateParts(ref);
  return month === 12 && day === 27;
}

export type NewYearContributionMailResult = {
  targetYear: number;
  skippedNotMailDay: boolean;
  sent: number;
  skippedAlreadySent: number;
  skippedNoEmail: number;
  failed: number;
  errors: string[];
};

export async function runNewYearContributionEmails(
  admin: SupabaseClient,
  options?: { force?: boolean; ref?: Date },
): Promise<NewYearContributionMailResult> {
  const ref = options?.ref ?? new Date();
  const { year: berlinYear } = berlinDateParts(ref);
  const targetYear = berlinYear + 1;

  if (!options?.force && !isNewYearContributionMailDay(ref)) {
    return {
      targetYear,
      skippedNotMailDay: true,
      sent: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
      failed: 0,
      errors: [],
    };
  }

  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id,start_date,fee_cents")
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (!userIds.length) {
    return {
      targetYear,
      skippedNotMailDay: false,
      sent: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
      failed: 0,
      errors: [],
    };
  }

  const full = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,gender,membership_number,billing_email,no_app_access")
    .in("id", userIds);
  let profiles = full.data;
  if (full.error) {
    if (!/billing_email|no_app_access|does not exist/i.test(full.error.message)) {
      throw new Error(full.error.message);
    }
    const fb = await admin
      .from("profiles")
      .select("id,first_name,last_name,email,gender,membership_number")
      .in("id", userIds);
    if (fb.error) throw new Error(fb.error.message);
    profiles = (fb.data ?? []) as typeof profiles;
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: sentRows } = await admin
    .from("membership_contribution_notices")
    .select("member_id")
    .eq("contribution_year", targetYear)
    .eq("channel", "email");
  const alreadySent = new Set((sentRows ?? []).map((r) => r.member_id));

  const { data: paidPaymentRows } = await admin
    .from("payments")
    .select("id,user_id,amount_cents,paid_at,created_at")
    .in("user_id", userIds)
    .eq("payment_type", "membership_fee")
    .eq("payment_status", "paid");
  const paidPaymentIds = new Set((paidPaymentRows ?? []).map((p) => p.id));
  const paidPaymentsByUser = new Map<
    string,
    { amount_cents: number; entry_date: string; payment_id: string }[]
  >();
  for (const row of paidPaymentRows ?? []) {
    if (!row.user_id) continue;
    const entryDate = (row.paid_at ?? row.created_at ?? "").slice(0, 10);
    if (!paidPaymentsByUser.has(row.user_id)) paidPaymentsByUser.set(row.user_id, []);
    paidPaymentsByUser.get(row.user_id)!.push({
      payment_id: row.id,
      amount_cents: row.amount_cents ?? 0,
      entry_date: entryDate,
    });
  }

  const { data: ledgerRows } = await admin
    .from("club_ledger_entries")
    .select("member_id,amount_cents,entry_date,bookkeeping_status,payment_id")
    .in("member_id", userIds)
    .eq("entry_type", "income")
    .eq("category", "membership");

  const paymentsByMember = new Map<string, { member_id: string; amount_cents: number; entry_date: string }[]>();
  const countedPaymentIdsByMember = new Map<string, Set<string>>();
  for (const row of ledgerRows ?? []) {
    if (!row.member_id) continue;
    const ledgerRow = row as {
      member_id: string;
      amount_cents: number;
      entry_date: string;
      bookkeeping_status?: string | null;
      payment_id?: string | null;
    };
    if (!membershipLedgerRowCountsAsPaid(ledgerRow, paidPaymentIds)) continue;
    if (!paymentsByMember.has(row.member_id)) paymentsByMember.set(row.member_id, []);
    paymentsByMember.get(row.member_id)!.push({
      member_id: row.member_id,
      amount_cents: row.amount_cents ?? 0,
      entry_date: row.entry_date,
    });
    if (ledgerRow.payment_id) {
      if (!countedPaymentIdsByMember.has(row.member_id)) {
        countedPaymentIdsByMember.set(row.member_id, new Set());
      }
      countedPaymentIdsByMember.get(row.member_id)!.add(ledgerRow.payment_id);
    }
  }
  for (const [userId, payments] of paidPaymentsByUser) {
    const counted = countedPaymentIdsByMember.get(userId) ?? new Set<string>();
    for (const payment of payments) {
      if (counted.has(payment.payment_id)) continue;
      if (!paymentsByMember.has(userId)) paymentsByMember.set(userId, []);
      paymentsByMember.get(userId)!.push({
        member_id: userId,
        amount_cents: payment.amount_cents,
        entry_date: payment.entry_date,
      });
    }
  }

  let sent = 0;
  let skippedAlreadySent = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const m of memberships ?? []) {
    if (!m.start_date) continue;
    if (alreadySent.has(m.user_id)) {
      skippedAlreadySent++;
      continue;
    }

    const profile = profileById.get(m.user_id);
    if (!profile) {
      skippedNoEmail++;
      continue;
    }
    const payTo = resolvePaymentEmail(profile);
    if (!payTo) {
      skippedNoEmail++;
      continue;
    }

    const feeCents = m.fee_cents ?? 1500;
    const payments = paymentsByMember.get(m.user_id) ?? [];
    const allYears = computeMemberContributionYears(
      profile,
      m.start_date,
      feeCents,
      payments,
      ref,
      true,
    );
    const target = allYears.find((y) => y.calendarYear === targetYear);
    if (!target) continue;

    const priorOpen = allYears.filter((y) => y.calendarYear < targetYear && y.status !== "paid");
    const openBlock = buildOpenContributionsBlock(priorOpen);
    const dueDate = `${targetYear}-01-01`;
    const paymentDeadline = paymentDeadlineForContributionYear(targetYear, m.start_date);
    const paymentReference = formatMembershipPaymentReference(
      targetYear,
      profile.membership_number,
      profile.first_name,
      profile.last_name,
    );

    try {
      const rendered = await renderEmailFromTemplate(
        EMAIL_TEMPLATE_KEYS.membershipContributionNewYear,
        {
          first_name: profile.first_name?.trim() || "Fan",
          gender: profile.gender ?? "",
          last_name: profile.last_name?.trim() || "",
          contribution_year: String(targetYear),
          fee_eur: formatEur(feeCents),
          due_date: formatDueDateDe(dueDate),
          payment_deadline: formatDueDateDe(paymentDeadline),
          payment_reference: paymentReference,
          open_contributions_block: openBlock,
          ...clubBankEmailVars(),
        },
      );

      const result = await sendEmailViaAccount({
        to: payTo,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        attachments: rendered.signatureAttachment
          ? [
              {
                filename: rendered.signatureAttachment.filename,
                content: Buffer.from(rendered.signatureAttachment.content),
                contentType: rendered.signatureAttachment.contentType,
                cid: rendered.signatureAttachment.cid,
              },
            ]
          : undefined,
      });

      if (!result.ok) {
        failed++;
        errors.push(`${payTo}: ${result.skipped ? "SMTP nicht konfiguriert" : "Senden fehlgeschlagen"}`);
        continue;
      }

      const { error: insErr } = await admin.from("membership_contribution_notices").insert({
        member_id: m.user_id,
        contribution_year: targetYear,
        channel: "email",
      });
      if (insErr && !/duplicate|unique/i.test(insErr.message)) {
        failed++;
        errors.push(`${payTo}: Protokoll fehlgeschlagen`);
        continue;
      }

      sent++;
    } catch (e) {
      failed++;
      errors.push(`${payTo}: ${e instanceof Error ? e.message : "Fehler"}`);
    }
  }

  return {
    targetYear,
    skippedNotMailDay: false,
    sent,
    skippedAlreadySent,
    skippedNoEmail,
    failed,
    errors,
  };
}
