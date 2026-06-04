import type { SupabaseClient } from "@supabase/supabase-js";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { profileDisplayName } from "@/lib/profiles/display";

export type YearLeaderboardRow = {
  userId: string;
  name: string;
  points: number;
  avatarUrl: string | null;
  rank: number;
  isSelf: boolean;
};

export type YearLeaderboardData = {
  rows: YearLeaderboardRow[];
  /** 11. Zeile: eigener Platz, wenn nicht in den Top 10 */
  selfRow: YearLeaderboardRow | null;
  currentUserId: string | null;
};

type RpcRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  points: number | string;
};

export async function loadYearLeaderboard(
  supabase: SupabaseClient,
  currentUserId: string | null,
  topLimit = 10,
): Promise<YearLeaderboardData> {
  const { data: leaderboard, error } = await supabase.rpc("member_year_points_leaderboard", {
    p_limit: 100,
  });
  if (error) {
    return { rows: [], selfRow: null, currentUserId };
  }

  const rpcRows = (leaderboard ?? []) as RpcRow[];
  const userIds = rpcRows.map((r) => r.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,email,avatar_path,updated_at")
        .in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const allRows: YearLeaderboardRow[] = rpcRows.map((r, i) => {
    const p = profileById.get(r.user_id);
    const name = p
      ? profileDisplayName(p)
      : r.first_name && r.last_name
        ? `${r.first_name} ${r.last_name}`
        : "Mitglied";
    return {
      userId: r.user_id,
      name,
      points: Number(r.points),
      avatarUrl: p ? getAvatarPublicUrl(p.avatar_path, p.updated_at ?? null) : null,
      rank: i + 1,
      isSelf: Boolean(currentUserId && r.user_id === currentUserId),
    };
  });

  const top = allRows.slice(0, topLimit);
  const inTop = currentUserId ? top.some((r) => r.userId === currentUserId) : false;

  let selfRow: YearLeaderboardRow | null = null;
  if (currentUserId && !inTop) {
    const mine = allRows.find((r) => r.userId === currentUserId);
    if (mine) selfRow = { ...mine, isSelf: true };
  }

  return { rows: top, selfRow, currentUserId };
}
