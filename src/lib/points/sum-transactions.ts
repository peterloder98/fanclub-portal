import type { SupabaseClient } from "@supabase/supabase-js";
import { berlinCalendarYear, berlinYearEndIso, berlinYearStartIso } from "@/lib/points/year-bounds";

const PAGE = 1000;

type PointsRow = { points: number | null; held_at?: string | null };

/**
 * Summe ohne die PostgREST-1000-Zeilen-Grenze: Seitenweise nachladen.
 */
export async function sumPointsRowsPaged(
  client: SupabaseClient,
  params: {
    userId?: string;
    fromIso: string;
    toIso?: string;
  },
): Promise<{ total: number; activityCount: number }> {
  let total = 0;
  let activityCount = 0;
  let from = 0;

  for (;;) {
    let q = client
      .from("points_transactions")
      .select("points,held_at")
      .gte("created_at", params.fromIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (params.toIso) q = q.lt("created_at", params.toIso);
    if (params.userId) q = q.eq("user_id", params.userId);

    const { data, error } = await q;
    if (error) {
      if (/held_at|does not exist/i.test(error.message)) {
        let fb = client
          .from("points_transactions")
          .select("points")
          .gte("created_at", params.fromIso)
          .order("created_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (params.toIso) fb = fb.lt("created_at", params.toIso);
        if (params.userId) fb = fb.eq("user_id", params.userId);
        const { data: rows, error: fbErr } = await fb;
        if (fbErr) throw fbErr;
        const batch = rows ?? [];
        for (const r of batch) {
          total += r.points ?? 0;
          activityCount += 1;
        }
        if (batch.length < PAGE) break;
        from += PAGE;
        continue;
      }
      throw error;
    }

    const batch = (data ?? []) as PointsRow[];
    for (const r of batch) {
      if (r.held_at) continue;
      total += r.points ?? 0;
      activityCount += 1;
    }
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  return { total, activityCount };
}

export async function sumUserPointsForBerlinYear(
  client: SupabaseClient,
  userId: string,
  year = berlinCalendarYear(),
): Promise<number> {
  const { data, error } = await client.rpc("year_points_for_user", {
    p_user_id: userId,
    p_year: year,
  });
  if (!error && data != null && Number.isFinite(Number(data))) {
    return Number(data);
  }

  const { total } = await sumPointsRowsPaged(client, {
    userId,
    fromIso: berlinYearStartIso(year),
    toIso: berlinYearEndIso(year),
  });
  return total;
}
