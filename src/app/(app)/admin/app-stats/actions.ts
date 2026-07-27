"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppStatsDayPoint = {
  date: string; // YYYY-MM-DD
  label: string;
  value: number;
};

export type AppStatsMonthPoint = {
  month: string; // YYYY-MM
  label: string;
  value: number;
};

export type AppStatsSnapshot = {
  activeMembersTotal: number;
  appRegisteredTotal: number;
  activeThisWeek: number;
  activeThisMonth: number;
  neverLoggedIn: number;
  activeYesterday: number;
  postsThisMonth: number;
  chatMessagesThisMonth: number;
  monthKey: string;
  monthLabel: string;
  /** Distinct Nutzer je Tag im gewählten Monat */
  usersPerDay: AppStatsDayPoint[];
  /** App-Zugriffe (Heartbeats) je Tag im gewählten Monat */
  hitsPerDay: AppStatsDayPoint[];
  /** Distinct eingeloggte Nutzer je Monat (12 Monate bis heute) */
  usersPerMonth: AppStatsMonthPoint[];
  /** Aktive Fanclub-Mitglieder je Monatsende (12 Monate bis heute) */
  membersPerMonth: AppStatsMonthPoint[];
};

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end, daysInMonth: endDate.getDate() };
}

function dayLabel(isoDate: string) {
  const day = Number(isoDate.slice(8, 10));
  return String(day);
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") throw new Error("Nur für Admins.");
  return user;
}

function buildDaySeries(
  ym: string,
  byDate: Map<string, number>,
): AppStatsDayPoint[] {
  const { daysInMonth } = monthRange(ym);
  const [y, m] = ym.split("-").map(Number);
  const out: AppStatsDayPoint[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    out.push({
      date,
      label: dayLabel(date),
      value: byDate.get(date) ?? 0,
    });
  }
  return out;
}

export async function loadAppStats(monthKey?: string): Promise<AppStatsSnapshot> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selected =
    monthKey && /^\d{4}-\d{2}$/.test(monthKey) && monthKey <= currentMonth
      ? monthKey
      : currentMonth;
  const { start: monthStart, end: monthEnd } = monthRange(selected);
  const { start: curStart, end: curEnd } = monthRange(currentMonth);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);

  const { data: activeMemberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const activeIds = [...new Set((activeMemberships ?? []).map((m) => m.user_id))];
  const activeMembersTotal = activeIds.length;

  let appRegisteredTotal = 0;
  let activeThisWeek = 0;
  let neverLoggedIn = 0;
  if (activeIds.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id,last_app_active_at")
      .in("id", activeIds);
    const rows = profiles ?? [];
    appRegisteredTotal = rows.filter((p) => p.last_app_active_at).length;
    activeThisWeek = rows.filter(
      (p) => p.last_app_active_at && p.last_app_active_at >= weekAgoIso,
    ).length;
    neverLoggedIn = rows.filter((p) => !p.last_app_active_at).length;
  }

  const { data: curMonthDays } = await admin
    .from("app_activity_days")
    .select("user_id")
    .gte("activity_date", curStart)
    .lte("activity_date", curEnd);
  const activeThisMonth = new Set((curMonthDays ?? []).map((r) => r.user_id)).size;

  const { data: yesterdayRows } = await admin
    .from("app_activity_days")
    .select("user_id")
    .eq("activity_date", yesterdayDate);

  // Tagesdaten für gewählten Monat
  let selectedDays: Array<{
    user_id: string;
    activity_date: string;
    hit_count?: number | null;
  }> | null = null;
  {
    const withHits = await admin
      .from("app_activity_days")
      .select("user_id,activity_date,hit_count")
      .gte("activity_date", monthStart)
      .lte("activity_date", monthEnd);
    if (withHits.error) {
      const fallback = await admin
        .from("app_activity_days")
        .select("user_id,activity_date")
        .gte("activity_date", monthStart)
        .lte("activity_date", monthEnd);
      selectedDays = fallback.data ?? [];
    } else {
      selectedDays = withHits.data ?? [];
    }
  }

  const usersByDate = new Map<string, Set<string>>();
  const hitsByDate = new Map<string, number>();
  for (const row of selectedDays ?? []) {
    const d = String(row.activity_date).slice(0, 10);
    if (!usersByDate.has(d)) usersByDate.set(d, new Set());
    usersByDate.get(d)!.add(row.user_id);
    const hits = typeof row.hit_count === "number" && row.hit_count > 0 ? row.hit_count : 1;
    hitsByDate.set(d, (hitsByDate.get(d) ?? 0) + hits);
  }
  const usersPerDay = buildDaySeries(
    selected,
    new Map([...usersByDate.entries()].map(([d, set]) => [d, set.size])),
  );
  const hitsPerDay = buildDaySeries(selected, hitsByDate);

  // 12-Monats-Vergleich (eingeloggte User) + Mitgliederbestand
  const usersPerMonth: AppStatsMonthPoint[] = [];
  const membersPerMonth: AppStatsMonthPoint[] = [];

  const rangeStart = monthRange(shiftMonth(currentMonth, -11)).start;
  const { data: yearDays } = await admin
    .from("app_activity_days")
    .select("user_id,activity_date")
    .gte("activity_date", rangeStart)
    .lte("activity_date", curEnd);

  const usersByMonth = new Map<string, Set<string>>();
  for (const row of yearDays ?? []) {
    const d = String(row.activity_date).slice(0, 10);
    const ym = d.slice(0, 7);
    if (!usersByMonth.has(ym)) usersByMonth.set(ym, new Set());
    usersByMonth.get(ym)!.add(row.user_id);
  }

  const { data: allMemberships } = await admin
    .from("memberships")
    .select("user_id,start_date,end_date,status");

  for (let i = 11; i >= 0; i--) {
    const ym = shiftMonth(currentMonth, -i);
    const { end } = monthRange(ym);
    usersPerMonth.push({
      month: ym,
      label: monthLabel(ym),
      value: usersByMonth.get(ym)?.size ?? 0,
    });

    const memberIds = new Set<string>();
    for (const m of allMemberships ?? []) {
      if (m.status === "applied") continue;
      const start = String(m.start_date ?? "").slice(0, 10);
      if (!start || start > end) continue;
      const endDate = m.end_date ? String(m.end_date).slice(0, 10) : null;
      if (endDate && endDate < end) continue;
      memberIds.add(m.user_id);
    }
    membersPerMonth.push({
      month: ym,
      label: monthLabel(ym),
      value: memberIds.size,
    });
  }

  let postsThisMonth = 0;
  let chatMessagesThisMonth = 0;
  try {
    const monthStartIso = `${curStart}T00:00:00.000Z`;
    const monthEndIso = `${curEnd}T23:59:59.999Z`;
    const { count: postsCount } = await admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartIso)
      .lte("created_at", monthEndIso)
      .eq("status", "published");
    postsThisMonth = postsCount ?? 0;
  } catch {
    postsThisMonth = 0;
  }
  try {
    const monthStartIso = `${curStart}T00:00:00.000Z`;
    const monthEndIso = `${curEnd}T23:59:59.999Z`;
    const { count: chatCount } = await admin
      .from("group_chat_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartIso)
      .lte("created_at", monthEndIso);
    chatMessagesThisMonth = chatCount ?? 0;
  } catch {
    chatMessagesThisMonth = 0;
  }

  return {
    activeMembersTotal,
    appRegisteredTotal,
    activeThisWeek,
    activeThisMonth,
    neverLoggedIn,
    activeYesterday: new Set((yesterdayRows ?? []).map((r) => r.user_id)).size,
    postsThisMonth,
    chatMessagesThisMonth,
    monthKey: selected,
    monthLabel: monthLabel(selected),
    usersPerDay,
    hitsPerDay,
    usersPerMonth,
    membersPerMonth,
  };
}
