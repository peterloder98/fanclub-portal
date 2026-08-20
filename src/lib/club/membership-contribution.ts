import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";
import { formatApplicationPaymentReference } from "@/lib/payments/club-bank";
import { resolveAnnualFeeCents } from "@/lib/payments/membership-fee-coverage";

export type ContributionStatus = "paid" | "open" | "overdue";

/** Tage nach Fälligkeit, ab denen der Beitrag als überfällig gilt. */
export const CONTRIBUTION_OVERDUE_DAYS = 14;

/** Zahlungsfrist in Tagen ab Fälligkeit (für E-Mails). */
export const CONTRIBUTION_PAYMENT_DEADLINE_DAYS = 14;

export type MemberContributionInfo = {
  userId: string;
  firstName: string;
  lastName: string;
  membershipNumber: string | null;
  calendarYear: number;
  feeCents: number;
  paidCents: number;
  openCents: number;
  status: ContributionStatus;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  dueDate: string;
  paymentDeadline: string;
  paymentReference: string;
};

export type ContributionStatusBrief = {
  status: ContributionStatus;
  openCents: number;
};

type MembershipPaymentRow = { member_id: string; amount_cents: number; entry_date: string };

/** Zählt eine Mitgliedsbeitrags-Buchung für den Beitragsstatus (nicht für Kontostand). */
export function membershipLedgerRowCountsAsPaid(
  row: { bookkeeping_status?: string | null; payment_id?: string | null },
  paidPaymentIds: ReadonlySet<string>,
): boolean {
  const status = row.bookkeeping_status ?? null;
  if (status === "cancelled") return false;
  if (status === "open") {
    return Boolean(row.payment_id && paidPaymentIds.has(row.payment_id));
  }
  return true;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseIsoDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function addDays(dateStr: string, days: number) {
  const d = parseIsoDate(dateStr);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function calendarYearPeriod(year: number) {
  return {
    year,
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: String(year),
  };
}

/** Kalenderjahre mit Beitragspflicht ab Eintritt bis Referenzjahr (inkl.). */
export function contributionYearsForMember(membershipStart: string, ref = new Date()): number[] {
  const joinYear = parseInt(membershipStart.slice(0, 4), 10);
  if (Number.isNaN(joinYear)) return [ref.getFullYear()];
  const endYear = ref.getFullYear();
  const years: number[] = [];
  for (let y = joinYear; y <= endYear; y++) years.push(y);
  return years;
}

/** Fälligkeitsdatum: Eintrittsjahr ab Eintritt, Folgejahre ab 01.01. */
export function dueDateForContributionYear(year: number, membershipStart: string): string {
  const joinYear = parseInt(membershipStart.slice(0, 4), 10);
  if (year === joinYear) return membershipStart;
  return `${year}-01-01`;
}

export function paymentDeadlineForContributionYear(year: number, membershipStart: string): string {
  return addDays(dueDateForContributionYear(year, membershipStart), CONTRIBUTION_PAYMENT_DEADLINE_DAYS);
}

/**
 * Verwendungszweck für Jahresbeiträge — derselbe namensbasierte Text wie beim Antrag.
 * year / membershipNumber bleiben in der Signatur für Aufrufer-Kompatibilität, fließen
 * nicht mehr in den VWZ ein (Bankabgleich über den Namen).
 */
export function formatMembershipPaymentReference(
  _year: number,
  _membershipNumber: string | null | undefined,
  firstName: string,
  lastName: string,
): string {
  return formatApplicationPaymentReference(firstName, lastName);
}

/** Verwendungszweck für Zahlungserinnerungen — immer „Mitgliedsbeitrag / Vorname Nachname“. */
export function resolveMemberPaymentReference(input: {
  calendarYear: number;
  membershipNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fromContribution?: string | null;
}): string {
  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  if (first || last) {
    return formatMembershipPaymentReference(
      input.calendarYear,
      input.membershipNumber,
      first,
      last,
    );
  }
  const fromContribution = input.fromContribution?.trim();
  if (fromContribution) {
    // Alte gespeicherte Formate („Beitrag YYYY, Nr. …“) nicht an Mitglieder weitergeben.
    if (!/^Beitrag\s+\d{4}/i.test(fromContribution)) return fromContribution;
  }
  return formatApplicationPaymentReference("", "");
}

export function formatDueDateDe(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}.${m}.${y}`;
}

/**
 * @deprecated Nutze calendarYearPeriod — rollierende Perioden werden nicht mehr verwendet.
 */
export function currentMembershipPeriod(startDate: string, ref = new Date()) {
  const year = ref.getFullYear();
  const p = calendarYearPeriod(year);
  return { start: p.start, end: p.end, label: p.label };
}

export function paymentBelongsToCalendarYear(paymentDate: string, year: number): boolean {
  return paymentDate.slice(0, 4) === String(year);
}

/** @deprecated Kalenderjahr-Zuordnung über entry_date-Jahr. */
export function paymentBelongsToPeriod(
  paymentDate: string,
  _membershipStart: string,
  periodStart: string,
  periodEnd: string,
): boolean {
  const y = periodStart.slice(0, 4);
  return paymentDate >= periodStart && paymentDate <= periodEnd && paymentDate.slice(0, 4) === y;
}

export function deriveContributionStatus(
  feeCents: number,
  paidCents: number,
  dueDate: string,
  ref = new Date(),
): ContributionStatus {
  const openCents = Math.max(0, feeCents - paidCents);
  if (openCents <= 0) return "paid";

  const due = parseIsoDate(dueDate);
  const daysSinceDue = Math.floor((ref.getTime() - due.getTime()) / 86_400_000);
  return daysSinceDue > CONTRIBUTION_OVERDUE_DAYS ? "overdue" : "open";
}

function paidCentsForCalendarYear(payments: MembershipPaymentRow[], year: number): number {
  return payments
    .filter((p) => paymentBelongsToCalendarYear(p.entry_date, year))
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);
}

/**
 * Verteilt Beitragszahlungen chronologisch auf Kalenderjahre (FIFO):
 * Überzahlung in einem Jahr deckt das nächste (z. B. 30 € → 2026 + 2027).
 */
export function allocatePaymentsAcrossYears(
  payments: MembershipPaymentRow[],
  years: number[],
  feeCents: number,
): Map<number, number> {
  const paidByYear = new Map<number, number>();
  for (const y of years) paidByYear.set(y, 0);
  if (!years.length || feeCents <= 0) return paidByYear;

  const sorted = [...payments].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  for (const payment of sorted) {
    let remaining = Math.max(0, payment.amount_cents ?? 0);
    for (const year of years) {
      if (remaining <= 0) break;
      const current = paidByYear.get(year) ?? 0;
      const need = Math.max(0, feeCents - current);
      if (need <= 0) continue;
      const take = Math.min(need, remaining);
      paidByYear.set(year, current + take);
      remaining -= take;
    }
  }
  return paidByYear;
}

function yearsNeededForPrepaidCoverage(
  membershipStart: string,
  payments: MembershipPaymentRow[],
  feeCents: number,
  baseYears: number[],
): number[] {
  if (feeCents <= 0) return baseYears;
  const joinYear = parseInt(membershipStart.slice(0, 4), 10);
  if (Number.isNaN(joinYear)) return baseYears;
  const totalPaid = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const covered = Math.floor(totalPaid / feeCents);
  if (covered <= 0) return baseYears;
  const years = new Set(baseYears);
  for (let i = 0; i < covered; i++) years.add(joinYear + i);
  return [...years].sort((a, b) => a - b);
}

type PaidMembershipPaymentRow = {
  payment_id: string;
  user_id: string;
  amount_cents: number;
  entry_date: string;
};

async function loadPaidMembershipPaymentsForUsers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[],
): Promise<{
  paidPaymentIds: Set<string>;
  paidPaymentsByUser: Map<string, PaidMembershipPaymentRow[]>;
}> {
  const paidPaymentIds = new Set<string>();
  const paidPaymentsByUser = new Map<string, PaidMembershipPaymentRow[]>();
  if (!userIds.length) return { paidPaymentIds, paidPaymentsByUser };

  const CHUNK = 200;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("payments")
      .select("id,user_id,amount_cents,paid_at,created_at")
      .in("user_id", chunk)
      .eq("payment_type", "membership_fee")
      .eq("payment_status", "paid");
    if (error) {
      if (/payments|does not exist/i.test(error.message)) {
        return { paidPaymentIds, paidPaymentsByUser };
      }
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      if (!row.user_id) continue;
      paidPaymentIds.add(row.id);
      const entryDate =
        (row.paid_at ?? row.created_at ?? "").slice(0, 10) || isoDate(new Date());
      if (!paidPaymentsByUser.has(row.user_id)) paidPaymentsByUser.set(row.user_id, []);
      paidPaymentsByUser.get(row.user_id)!.push({
        payment_id: row.id,
        user_id: row.user_id,
        amount_cents: row.amount_cents ?? 0,
        entry_date: entryDate,
      });
    }
  }
  return { paidPaymentIds, paidPaymentsByUser };
}

async function loadMembershipPaymentsForUsers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[],
): Promise<Map<string, MembershipPaymentRow[]>> {
  const map = new Map<string, MembershipPaymentRow[]>();
  if (!userIds.length) return map;

  const { paidPaymentIds, paidPaymentsByUser } = await loadPaidMembershipPaymentsForUsers(
    admin,
    userIds,
  );
  const countedPaymentIdsByMember = new Map<string, Set<string>>();

  const CHUNK = 200;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("club_ledger_entries")
      .select("member_id,amount_cents,entry_date,bookkeeping_status,payment_id")
      .in("member_id", chunk)
      .eq("entry_type", "income")
      .eq("category", "membership");
    if (error) {
      if (/club_ledger_entries|does not exist/i.test(error.message)) return map;
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      if (!row.member_id) continue;
      const ledgerRow = row as MembershipPaymentRow & {
        bookkeeping_status?: string | null;
        payment_id?: string | null;
      };
      if (
        !membershipLedgerRowCountsAsPaid(ledgerRow, paidPaymentIds)
      ) {
        continue;
      }
      if (!map.has(row.member_id)) map.set(row.member_id, []);
      map.get(row.member_id)!.push({
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
  }

  for (const [userId, payments] of paidPaymentsByUser) {
    const counted = countedPaymentIdsByMember.get(userId) ?? new Set<string>();
    for (const payment of payments) {
      if (counted.has(payment.payment_id)) continue;
      if (!map.has(userId)) map.set(userId, []);
      map.get(userId)!.push({
        member_id: userId,
        amount_cents: payment.amount_cents,
        entry_date: payment.entry_date,
      });
    }
  }

  return map;
}

export function computeYearContribution(
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    membership_number: string | null;
  },
  membershipStart: string,
  feeCents: number,
  year: number,
  payments: MembershipPaymentRow[],
  ref = new Date(),
  paidCentsOverride?: number,
): MemberContributionInfo {
  const period = calendarYearPeriod(year);
  const paidCents =
    typeof paidCentsOverride === "number"
      ? paidCentsOverride
      : paidCentsForCalendarYear(payments, year);
  const openCents = Math.max(0, feeCents - paidCents);
  const dueDate = dueDateForContributionYear(year, membershipStart);
  const status = deriveContributionStatus(feeCents, paidCents, dueDate, ref);

  return {
    userId: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    membershipNumber: profile.membership_number,
    calendarYear: year,
    feeCents,
    paidCents,
    openCents,
    status,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
    dueDate,
    paymentDeadline: paymentDeadlineForContributionYear(year, membershipStart),
    paymentReference: formatMembershipPaymentReference(
      year,
      profile.membership_number,
      profile.first_name,
      profile.last_name,
    ),
  };
}

function statusRank(status: ContributionStatus): number {
  if (status === "overdue") return 0;
  if (status === "open") return 1;
  return 2;
}

/** Dringlichster offener Beitrag, sonst aktuelles Kalenderjahr. */
export function pickPrimaryContribution(
  years: MemberContributionInfo[],
): MemberContributionInfo | null {
  if (!years.length) return null;
  const open = years.filter((y) => y.status !== "paid");
  if (!open.length) return years[years.length - 1] ?? null;
  open.sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    if (r !== 0) return r;
    return a.calendarYear - b.calendarYear;
  });
  return open[0] ?? null;
}

export function computeMemberContributionYears(
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    membership_number: string | null;
  },
  membershipStart: string,
  feeCents: number,
  payments: MembershipPaymentRow[],
  ref = new Date(),
  includeNextYear = false,
): MemberContributionInfo[] {
  let years = contributionYearsForMember(membershipStart, ref);
  if (includeNextYear) {
    const next = ref.getFullYear() + 1;
    if (!years.includes(next)) years = [...years, next];
  }
  years = yearsNeededForPrepaidCoverage(membershipStart, payments, feeCents, years);
  const paidByYear = allocatePaymentsAcrossYears(payments, years, feeCents);
  return years.map((year) =>
    computeYearContribution(
      profile,
      membershipStart,
      feeCents,
      year,
      payments,
      ref,
      paidByYear.get(year) ?? 0,
    ),
  );
}

function computeContributionFromPayments(
  userId: string,
  startDate: string,
  feeCents: number,
  paymentsByMember: Map<string, MembershipPaymentRow[]>,
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    membership_number: string | null;
  },
  ref = new Date(),
): ContributionStatusBrief {
  const payments = paymentsByMember.get(userId) ?? [];
  const years = computeMemberContributionYears(profile, startDate, feeCents, payments, ref);
  const primary = pickPrimaryContribution(years);
  if (!primary) return { status: "paid", openCents: 0 };
  if (primary.status === "paid") return { status: "paid", openCents: 0 };
  const totalOpen = years
    .filter((y) => y.status !== "paid")
    .reduce((s, y) => s + y.openCents, 0);
  return { status: primary.status, openCents: totalOpen };
}

export async function getMemberContributionYears(
  userId: string,
  options?: { includeNextYear?: boolean },
): Promise<MemberContributionInfo[]> {
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return [];

  const { data: membership } = await admin
    .from("memberships")
    .select("start_date,fee_cents,status")
    .eq("user_id", userId)
    .in("status", ["active", "applied", "suspended"])
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) return [];

  const startDate = membership.start_date?.trim() || isoDate(new Date());
  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, [userId]);
  const payments = paymentsByMember.get(userId) ?? [];
  const totalPaid = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const feeCents = resolveAnnualFeeCents(membership.fee_cents, totalPaid || membership.fee_cents || 1500);
  return computeMemberContributionYears(
    profile,
    startDate,
    feeCents,
    payments,
    new Date(),
    options?.includeNextYear,
  );
}

export async function getMemberContributionInfo(
  userId: string,
): Promise<MemberContributionInfo | null> {
  const years = await getMemberContributionYears(userId);
  return pickPrimaryContribution(years);
}

export async function batchMemberContributionStatus(
  userIds: string[],
): Promise<Map<string, ContributionStatusBrief | null>> {
  const map = new Map<string, ContributionStatusBrief | null>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return map;
  ids.forEach((id) => map.set(id, null));

  const admin = createSupabaseAdminClient();
  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id,start_date,fee_cents")
    .in("user_id", ids)
    .in("status", ["active", "applied", "suspended"]);
  if (mErr) throw new Error(mErr.message);
  if (!memberships?.length) return map;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number")
    .in("id", memberships.map((m) => m.user_id));

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const memberIds = memberships.map((m) => m.user_id);
  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, memberIds);
  const now = new Date();

  for (const m of memberships) {
    const startDate = m.start_date?.trim() || isoDate(now);
    const profile = profileById.get(m.user_id);
    if (!profile) continue;
    const payments = paymentsByMember.get(m.user_id) ?? [];
    const totalPaid = payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
    const feeCents = resolveAnnualFeeCents(m.fee_cents, totalPaid || m.fee_cents || 1500);
    map.set(
      m.user_id,
      computeContributionFromPayments(
        m.user_id,
        startDate,
        feeCents,
        paymentsByMember,
        profile,
        now,
      ),
    );
  }
  return map;
}

export async function listOpenContributions(): Promise<MemberContributionInfo[]> {
  const admin = createSupabaseAdminClient();
  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id,start_date,fee_cents")
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (!userIds.length) return [];

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number")
    .in("id", userIds)
    .not("membership_number", "is", null);
  if (pErr) throw new Error(pErr.message);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, userIds);
  const now = new Date();
  const results: MemberContributionInfo[] = [];

  for (const m of memberships ?? []) {
    const p = profileById.get(m.user_id);
    if (!p || !m.start_date) continue;
    const payments = paymentsByMember.get(m.user_id) ?? [];
    const totalPaid = payments.reduce((s, pmt) => s + (pmt.amount_cents ?? 0), 0);
    const feeCents = resolveAnnualFeeCents(m.fee_cents, totalPaid || m.fee_cents || 1500);
    const years = computeMemberContributionYears(p, m.start_date, feeCents, payments, now);
    for (const y of years) {
      if (y.status !== "paid") results.push(y);
    }
  }

  results.sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    if (r !== 0) return r;
    if (a.calendarYear !== b.calendarYear) return a.calendarYear - b.calendarYear;
    return b.openCents - a.openCents;
  });

  return results;
}

export function contributionStatusLabel(status: ContributionStatus, year?: number) {
  const suffix = year ? ` (${year})` : "";
  if (status === "paid") return `Beitrag bezahlt${suffix}`;
  if (status === "overdue") return `Beitrag überfällig${suffix}`;
  return `Beitrag offen${suffix}`;
}

export function formatContributionEmailVars(info: MemberContributionInfo) {
  return {
    fee_eur: formatEur(info.feeCents),
    fee_paid_eur: formatEur(info.paidCents),
    fee_open_eur: formatEur(info.openCents),
    membership_period: info.periodLabel,
    payment_reference: info.paymentReference,
    due_date: formatDueDateDe(info.dueDate),
    payment_deadline: formatDueDateDe(info.paymentDeadline),
    contribution_year: String(info.calendarYear),
  };
}

/** Textblock für offene Vorjahre (Jahres-Mail). */
export function buildOpenContributionsBlock(years: MemberContributionInfo[]): string {
  const openPrior = years.filter((y) => y.status !== "paid");
  if (!openPrior.length) return "";

  const lines = openPrior.map(
    (y) =>
      `Für das Kalenderjahr ${y.calendarYear} ist dein Mitgliedsbeitrag noch nicht vollständig bei uns eingegangen (noch offen: ${formatEur(y.openCents)}).\nVerwendungszweck: ${y.paymentReference}`,
  );

  return `Hinweis zu noch offenen Beiträgen:\n\n${lines.join("\n\n")}\n\nBitte kläre das zeitnah mit uns, falls du Fragen hast.`;
}
