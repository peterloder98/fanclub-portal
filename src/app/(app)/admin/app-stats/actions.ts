"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppStatsMonthPoint = {
  month: string; // YYYY-MM
  label: string;
  activeUsers: number;
};

export type AppStatsSnapshot = {
  activeMembersTotal: number;
  appRegisteredTotal: number;
  activeThisWeek: number;
  activeThisMonth: number;
  monthKey: string;
  monthLabel: string;
  monthSeries: AppStatsMonthPoint[];
  /** Extra KPIs */
  neverLoggedIn: number;
  activeYesterday: number;
  postsThisMonth: number;
  chatMessagesThisMonth: number;
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
  return { start, end };
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

export async function loadAppStats(monthKey?: string): Promise<AppStatsSnapshot> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selected = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : currentMonth;
  const { start: monthStart, end: monthEnd } = monthRange(selected);

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

  const { count: activeThisMonthCount } = await admin
    .from("app_activity_days")
    .select("user_id", { count: "exact", head: true })
    .gte("activity_date", monthStart)
    .lte("activity_date", monthEnd);

  // Distinct users in month — head count may overcount if multiple days; use distinct via fetch
  const { data: monthDays } = await admin
    .from("app_activity_days")
    .select("user_id")
    .gte("activity_date", monthStart)
    .lte("activity_date", monthEnd);
  const activeThisMonth = new Set((monthDays ?? []).map((r) => r.user_id)).size;

  const { count: activeYesterdayCount } = await admin
    .from("app_activity_days")
    .select("user_id", { count: "exact", head: true })
    .eq("activity_date", yesterdayDate);

  // Series: last 12 months ending at selected month
  const monthSeries: AppStatsMonthPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const ym = shiftMonth(selected, -i);
    const { start, end } = monthRange(ym);
    const { data } = await admin
      .from("app_activity_days")
      .select("user_id")
      .gte("activity_date", start)
      .lte("activity_date", end);
    monthSeries.push({
      month: ym,
      label: monthLabel(ym),
      activeUsers: new Set((data ?? []).map((r) => r.user_id)).size,
    });
  }

  let postsThisMonth = 0;
  let chatMessagesThisMonth = 0;
  try {
    const monthStartIso = `${monthStart}T00:00:00.000Z`;
    const monthEndIso = `${monthEnd}T23:59:59.999Z`;
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
    const monthStartIso = `${monthStart}T00:00:00.000Z`;
    const monthEndIso = `${monthEnd}T23:59:59.999Z`;
    const { count: chatCount } = await admin
      .from("group_chat_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStartIso)
      .lte("created_at", monthEndIso);
    chatMessagesThisMonth = chatCount ?? 0;
  } catch {
    chatMessagesThisMonth = 0;
  }

  void activeThisMonthCount;
  void activeYesterdayCount;

  const { data: yesterdayRows } = await admin
    .from("app_activity_days")
    .select("user_id")
    .eq("activity_date", yesterdayDate);

  return {
    activeMembersTotal,
    appRegisteredTotal,
    activeThisWeek,
    activeThisMonth,
    monthKey: selected,
    monthLabel: monthLabel(selected),
    monthSeries,
    neverLoggedIn,
    activeYesterday: new Set((yesterdayRows ?? []).map((r) => r.user_id)).size,
    postsThisMonth,
    chatMessagesThisMonth,
  };
}
