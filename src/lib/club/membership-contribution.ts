import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";

export type ContributionStatus = "paid" | "open" | "overdue";

export type MemberContributionInfo = {
  userId: string;
  firstName: string;
  lastName: string;
  membershipNumber: string | null;
  feeCents: number;
  paidCents: number;
  openCents: number;
  status: ContributionStatus;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
};

export type ContributionStatusBrief = {
  status: ContributionStatus;
  openCents: number;
};

const GRACE_DAYS = 90;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function currentMembershipPeriod(startDate: string, ref = new Date()) {
  const start = new Date(`${startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) {
    const y = ref.getFullYear();
    return {
      start: `${y}-01-01`,
      end: `${y}-12-31`,
      label: String(y),
    };
  }

  let periodStart = new Date(start);
  for (let i = 0; i < 80; i++) {
    const periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    if (ref >= periodStart && ref <= periodEnd) {
      const label = `${isoDate(periodStart).slice(0, 4)}/${isoDate(periodEnd).slice(0, 4)}`;
      return { start: isoDate(periodStart), end: isoDate(periodEnd), label };
    }
    if (ref < periodStart) break;
    periodStart = new Date(periodStart);
    periodStart.setFullYear(periodStart.getFullYear() + 1);
  }

  const y = ref.getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) };
}

export function deriveContributionStatus(
  feeCents: number,
  paidCents: number,
  periodStart: string,
  ref = new Date(),
): ContributionStatus {
  const openCents = Math.max(0, feeCents - paidCents);
  if (openCents <= 0) return "paid";

  const start = new Date(`${periodStart}T12:00:00`);
  const daysSinceStart = Math.floor((ref.getTime() - start.getTime()) / 86_400_000);
  return daysSinceStart > GRACE_DAYS ? "overdue" : "open";
}

type MembershipPaymentRow = { member_id: string; amount_cents: number; entry_date: string };

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
      .select("member_id,amount_cents,entry_date")
      .in("member_id", chunk)
      .eq("entry_type", "income")
      .eq("category", "membership");
    if (error) {
      if (/club_ledger_entries|does not exist/i.test(error.message)) return map;
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      if (!row.member_id) continue;
      if (!map.has(row.member_id)) map.set(row.member_id, []);
      map.get(row.member_id)!.push(row as MembershipPaymentRow);
    }
  }
  return map;
}

function computeContributionFromPayments(
  userId: string,
  startDate: string,
  feeCents: number,
  paymentsByMember: Map<string, MembershipPaymentRow[]>,
  ref = new Date(),
): ContributionStatusBrief {
  const period = currentMembershipPeriod(startDate, ref);
  const payments = paymentsByMember.get(userId) ?? [];
  const paidCents = payments
    .filter((p) => p.entry_date >= period.start && p.entry_date <= period.end)
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const openCents = Math.max(0, feeCents - paidCents);
  return {
    status: deriveContributionStatus(feeCents, paidCents, period.start, ref),
    openCents,
  };
}

export async function getMemberContributionInfo(
  userId: string,
): Promise<MemberContributionInfo | null> {
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: membership } = await admin
    .from("memberships")
    .select("start_date,fee_cents,status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.start_date) return null;

  const feeCents = membership.fee_cents ?? 1500;
  const period = currentMembershipPeriod(membership.start_date);
  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, [userId]);
  const brief = computeContributionFromPayments(
    userId,
    membership.start_date,
    feeCents,
    paymentsByMember,
  );
  const payments = paymentsByMember.get(userId) ?? [];
  const paidCents = payments
    .filter((p) => p.entry_date >= period.start && p.entry_date <= period.end)
    .reduce((s, p) => s + (p.amount_cents ?? 0), 0);

  return {
    userId: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    membershipNumber: profile.membership_number,
    feeCents,
    paidCents,
    openCents: brief.openCents,
    status: brief.status,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
  };
}

/** Batch: 2–3 DB-Abfragen statt N×Einzelabfragen (skaliert bis ~500+ Mitglieder). */
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

  const activeIds = memberships.map((m) => m.user_id);
  const paymentsByMember = await loadMembershipPaymentsForUsers(admin, activeIds);
  const now = new Date();

  for (const m of memberships) {
    if (!m.start_date) continue;
    map.set(
      m.user_id,
      computeContributionFromPayments(
        m.user_id,
        m.start_date,
        m.fee_cents ?? 1500,
        paymentsByMember,
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
    const period = currentMembershipPeriod(m.start_date, now);
    const brief = computeContributionFromPayments(
      m.user_id,
      m.start_date,
      feeCents,
      paymentsByMember,
      now,
    );
    if (brief.status === "paid") continue;

    const payments = paymentsByMember.get(m.user_id) ?? [];
    const paidCents = payments
      .filter((row) => row.entry_date >= period.start && row.entry_date <= period.end)
      .reduce((s, row) => s + (row.amount_cents ?? 0), 0);

    results.push({
      userId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      membershipNumber: p.membership_number,
      feeCents,
      paidCents,
      openCents: brief.openCents,
      status: brief.status,
      periodStart: period.start,
      periodEnd: period.end,
      periodLabel: period.label,
    });
  }

  results.sort((a, b) => {
    const rank = (s: ContributionStatus) => (s === "overdue" ? 0 : 1);
    return rank(a.status) - rank(b.status) || b.openCents - a.openCents;
  });

  return results;
}

export function contributionStatusLabel(status: ContributionStatus) {
  if (status === "paid") return "Beitrag bezahlt";
  if (status === "overdue") return "Beitrag überfällig";
  return "Beitrag offen";
}

export function formatContributionEmailVars(info: MemberContributionInfo) {
  return {
    fee_eur: formatEur(info.feeCents),
    fee_paid_eur: formatEur(info.paidCents),
    fee_open_eur: formatEur(info.openCents),
    membership_period: info.periodLabel,
  };
}
