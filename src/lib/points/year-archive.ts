import type { SupabaseClient } from "@supabase/supabase-js";
import { berlinYearEndIso, berlinYearStartIso } from "@/lib/points/year-bounds";

export type ArchiveMeta = {
  year: number;
  frozen_at: string;
  lottery_completed_at: string | null;
};

export type ArchiveRow = {
  user_id: string;
  points: number;
  activity_count: number;
};

export async function freezePointsYear(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<{ ok: boolean; alreadyFrozen?: boolean; rows?: number; error?: string }> {
  const { data, error } = await admin.rpc("freeze_points_year", { p_year: pointsYear });
  if (!error && data && typeof data === "object") {
    const row = data as { ok?: boolean; already_frozen?: boolean; rows?: number; error?: string };
    return {
      ok: Boolean(row.ok),
      alreadyFrozen: Boolean(row.already_frozen),
      rows: row.rows,
      error: row.error,
    };
  }

  if (error && !/freeze_points_year|does not exist/i.test(error.message)) {
    return { ok: false, error: error.message };
  }

  return freezePointsYearFallback(admin, pointsYear);
}

async function freezePointsYearFallback(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<{ ok: boolean; alreadyFrozen?: boolean; rows?: number; error?: string }> {
  const { data: meta } = await admin
    .from("points_year_archive_meta")
    .select("year")
    .eq("year", pointsYear)
    .maybeSingle();
  if (meta?.year) {
    const { count } = await admin
      .from("points_year_archives")
      .select("user_id", { count: "exact", head: true })
      .eq("year", pointsYear);
    return { ok: true, alreadyFrozen: true, rows: count ?? 0 };
  }

  const { error: metaErr } = await admin.from("points_year_archive_meta").insert({
    year: pointsYear,
    frozen_at: new Date().toISOString(),
  });
  if (metaErr) {
    if (/duplicate|unique|23505/i.test(metaErr.message)) {
      return { ok: true, alreadyFrozen: true };
    }
    if (/points_year_archive_meta|does not exist/i.test(metaErr.message)) {
      return { ok: false, error: "archive_tables_missing" };
    }
    return { ok: false, error: metaErr.message };
  }

  const fromIso = berlinYearStartIso(pointsYear);
  const toIso = berlinYearEndIso(pointsYear);
  const byUser = new Map<string, { points: number; activity_count: number }>();
  let offset = 0;
  const page = 1000;
  for (;;) {
    const { data: rows, error } = await admin
      .from("points_transactions")
      .select("user_id,points,held_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + page - 1);
    if (error) return { ok: false, error: error.message };
    const batch = rows ?? [];
    for (const r of batch) {
      if ((r as { held_at?: string | null }).held_at) continue;
      const cur = byUser.get(r.user_id) ?? { points: 0, activity_count: 0 };
      cur.points += r.points ?? 0;
      cur.activity_count += 1;
      byUser.set(r.user_id, cur);
    }
    if (batch.length < page) break;
    offset += page;
  }

  const inserts = [...byUser.entries()]
    .filter(([, s]) => s.points > 0)
    .map(([user_id, s]) => ({
      year: pointsYear,
      user_id,
      points: s.points,
      activity_count: s.activity_count,
    }));
  if (inserts.length) {
    const { error: insErr } = await admin.from("points_year_archives").insert(inserts);
    if (insErr && !/duplicate|unique|23505/i.test(insErr.message)) {
      return { ok: false, error: insErr.message };
    }
  }
  return { ok: true, alreadyFrozen: false, rows: inserts.length };
}

export async function loadYearArchiveTotals(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<ArchiveRow[] | null> {
  const { data, error } = await admin
    .from("points_year_archives")
    .select("user_id,points,activity_count")
    .eq("year", pointsYear);
  if (error) {
    if (/points_year_archives|does not exist/i.test(error.message)) return null;
    throw error;
  }
  return (data ?? []).map((r) => ({
    user_id: r.user_id,
    points: r.points,
    activity_count: r.activity_count,
  }));
}

export async function loadArchiveMeta(
  client: SupabaseClient,
  pointsYear: number,
): Promise<ArchiveMeta | null> {
  const { data, error } = await client
    .from("points_year_archive_meta")
    .select("year,frozen_at,lottery_completed_at")
    .eq("year", pointsYear)
    .maybeSingle();
  if (error || !data) return null;
  return data as ArchiveMeta;
}

export async function markArchiveLotteryCompleted(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("points_year_archive_meta")
    .update({ lottery_completed_at: now })
    .eq("year", pointsYear);
  if (error && !/points_year_archive_meta|does not exist/i.test(error.message)) {
    console.error("[year-archive] lottery_completed_at:", error.message);
  }
}

/** Live-Summe als Notnagel, seitenweise — nicht für die Auslosung, wenn Archiv da ist. */
export async function liveYearTotalsPaged(
  admin: SupabaseClient,
  pointsYear: number,
): Promise<ArchiveRow[]> {
  const fromIso = berlinYearStartIso(pointsYear);
  const toIso = berlinYearEndIso(pointsYear);
  const byUser = new Map<string, { points: number; activity_count: number }>();
  let offset = 0;
  const page = 1000;
  for (;;) {
    const { data: rows, error } = await admin
      .from("points_transactions")
      .select("user_id,points,held_at")
      .gte("created_at", fromIso)
      .lt("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    const batch = rows ?? [];
    for (const r of batch) {
      if ((r as { held_at?: string | null }).held_at) continue;
      const cur = byUser.get(r.user_id) ?? { points: 0, activity_count: 0 };
      cur.points += r.points ?? 0;
      cur.activity_count += 1;
      byUser.set(r.user_id, cur);
    }
    if (batch.length < page) break;
    offset += page;
  }
  return [...byUser.entries()]
    .map(([user_id, s]) => ({ user_id, points: s.points, activity_count: s.activity_count }))
    .filter((x) => x.points > 0);
}
