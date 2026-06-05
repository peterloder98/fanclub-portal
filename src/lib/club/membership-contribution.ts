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

  const { data: payments } = await admin
    .from("club_ledger_entries")
    .select("amount_cents")
    .eq("member_id", userId)
    .eq("entry_type", "income")
    .eq("category", "membership")
    .gte("entry_date", period.start)
    .lte("entry_date", period.end);

  const paidCents = (payments ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const openCents = Math.max(0, feeCents - paidCents);
  const status = deriveContributionStatus(feeCents, paidCents, period.start);

  return {
    userId: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    membershipNumber: profile.membership_number,
    feeCents,
    paidCents,
    openCents,
    status,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
  };
}

export async function batchMemberContributionStatus(
  userIds: string[],
): Promise<Map<string, MemberContributionInfo | null>> {
  const map = new Map<string, MemberContributionInfo | null>();
  await Promise.all(
    userIds.map(async (id) => {
      map.set(id, await getMemberContributionInfo(id));
    }),
  );
  return map;
}

export async function listOpenContributions(): Promise<MemberContributionInfo[]> {
  const admin = createSupabaseAdminClient();
  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id,start_date,fee_cents")
    .eq("status", "active");

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (!userIds.length) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,membership_number")
    .in("id", userIds)
    .not("membership_number", "is", null);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const results: MemberContributionInfo[] = [];

  for (const m of memberships ?? []) {
    const p = profileById.get(m.user_id);
    if (!p || !m.start_date) continue;
    const info = await getMemberContributionInfo(m.user_id);
    if (info && info.status !== "paid") results.push(info);
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
