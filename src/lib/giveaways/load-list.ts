import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GiveawayListSort = "newest" | "ends_at";

export async function loadGiveawayListItems(
  userId: string | null,
  sort: GiveawayListSort = "ends_at",
) {
  const supabase = await createSupabaseServerClient();
  const query = supabase
    .from("giveaways")
    .select(
      "id,title,description,entry_mode,ends_at,created_at,status,is_paused,is_year_end_lottery,points_year",
    )
    .eq("is_active", true);

  const { data: rows } = await (sort === "newest"
    ? query.order("created_at", { ascending: false })
    : query.order("ends_at", { ascending: true }));

  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return [];

  const { data: prizes } = await supabase
    .from("giveaway_prizes")
    .select("giveaway_id,name,sort_order")
    .in("giveaway_id", ids)
    .order("sort_order", { ascending: true });

  const { data: entries } = await supabase
    .from("giveaway_entries")
    .select("giveaway_id,user_id,is_eligible")
    .in("giveaway_id", ids);

  const prizeNamesByG = new Map<string, string[]>();
  (prizes ?? []).forEach((p) => {
    const arr = prizeNamesByG.get(p.giveaway_id) ?? [];
    arr.push(p.name);
    prizeNamesByG.set(p.giveaway_id, arr);
  });

  const countByG = new Map<string, number>();
  (entries ?? []).forEach((e) => {
    countByG.set(e.giveaway_id, (countByG.get(e.giveaway_id) ?? 0) + 1);
  });

  const myEntryByGiveaway = new Map<string, boolean>();
  for (const e of entries ?? []) {
    if (userId && e.user_id === userId) {
      myEntryByGiveaway.set(e.giveaway_id, Boolean(e.is_eligible));
    }
  }

  return (rows ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    entry_mode: g.entry_mode as "simple" | "quiz",
    ends_at: g.ends_at,
    created_at: g.created_at as string,
    status: g.status,
    isPaused: Boolean((g as { is_paused?: boolean }).is_paused),
    isYearEndLottery: Boolean((g as { is_year_end_lottery?: boolean }).is_year_end_lottery),
    pointsYear: (g as { points_year?: number | null }).points_year ?? null,
    prizeNames: prizeNamesByG.get(g.id) ?? [],
    entryCount: countByG.get(g.id) ?? 0,
    myEntered: myEntryByGiveaway.has(g.id),
    myEligible: myEntryByGiveaway.get(g.id) ?? null,
  }));
}
