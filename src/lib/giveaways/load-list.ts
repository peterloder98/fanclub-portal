import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function loadGiveawayListItems(userId: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("giveaways")
    .select("id,title,description,entry_mode,ends_at,status")
    .eq("is_active", true)
    .order("ends_at", { ascending: false });

  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return [];

  const { data: prizes } = await supabase
    .from("giveaway_prizes")
    .select("giveaway_id,name,sort_order")
    .in("giveaway_id", ids)
    .order("sort_order", { ascending: true });

  const { data: entries } = await supabase
    .from("giveaway_entries")
    .select("giveaway_id,user_id")
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

  const mySet = new Set(
    (entries ?? []).filter((e) => e.user_id === userId).map((e) => e.giveaway_id),
  );

  return (rows ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    entry_mode: g.entry_mode as "simple" | "quiz",
    ends_at: g.ends_at,
    status: g.status,
    prizeNames: prizeNamesByG.get(g.id) ?? [],
    entryCount: countByG.get(g.id) ?? 0,
    myEntered: mySet.has(g.id),
  }));
}
