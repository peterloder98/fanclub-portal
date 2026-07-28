import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";

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

export function formatMembershipPaymentReference(
  year: number,
  membershipNumber: string | null | undefined,
  firstName: string,
  lastName: string,
): string {
  const nr = membershipNumber?.trim() || "—";
  const name =
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "Mitglied";
  return `Beitrag ${year}, Nr. ${nr}, ${name}`;
}

/** Verwendungszweck für Zahlungserinnerungen — immer mit Namen des Empfängers. */
export function resolveMemberPaymentReference(input: {
  calendarYear: number;
  membershipNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fromContribution?: string | null;
}): string {
  const fromContribution = input.fromContribution?.trim();
  if (fromContribution) return fromContribution;
  return formatMembershipPaymentReference(
    input.calendarYear,
    input.membershipNumber,
    input.firstName ?? "",
    input.lastName ?? "",
  );
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

async function loadMembershipPaymentsForUsers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userIds: string[],
): Promise<Map<string, MembershipPaymentRow[]>> {
  const map = new Map<string, MembershipPaymentRow[]>();
  if (!userIds.length) return map;

  const CHUNK = 200;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { data, error } = await admin
      .from("club_ledger_entries")
      .select("member_id,amount_cents,entry_date,bookkeeping_status")
      .in("member_id", chunk)
      .eq("entry_type", "income")
      .eq("category", "membership");
    if (error) {
      if (/club_ledger_entries|does not exist/i.test(error.message)) return map;
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      if (!row.member_id) continue;
      const status = (row as { bookkeeping_status?: string | null }).bookkeeping_status;
      if (status === "open" || status === "cancelled") continue;
      if (!map.has(row.member_id)) map.set(row.member_id, []);
      map.get(row.member_id)!.push(row as MembershipPaymentRow);
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
): MemberContributionInfo {
  const period = calendarYearPeriod(year);
  const paidCents = paidCentsForCalendarYear(payments, year);
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
  const years = contributionYearsForMember(membershipStart, ref);
  if (includeNextYear) {
    const next = ref.getFullYear() + 1;
    if (!years.includes(next)) years.push(next);
  }
  return years.map((year) =>
    computeYearContribution(profile, membershipStart, feeCents, year, payments, ref),
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
    .eq("status", "active")
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.start_date) return [];

  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, [userId]);
  const payments = paymentsByMember.get(userId) ?? [];
  return computeMemberContributionYears(
    profile,
    membership.start_date,
    membership.fee_cents ?? 1500,
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
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);
  if (!memberships?.length) return map;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number")
    .in("id", memberships.map((m) => m.user_id));

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const activeIds = memberships.map((m) => m.user_id);
  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, activeIds);
  const now = new Date();

  for (const m of memberships) {
    if (!m.start_date) continue;
    const profile = profileById.get(m.user_id);
    if (!profile) continue;
    map.set(
      m.user_id,
      computeContributionFromPayments(
        m.user_id,
        m.start_date,
        m.fee_cents ?? 1500,
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
    const feeCents = m.fee_cents ?? 1500;
    const payments = paymentsByMember.get(m.user_id) ?? [];
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
