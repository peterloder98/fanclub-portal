import type { SupabaseClient } from "@supabase/supabase-js";
import { pickGiveawayWinners } from "@/lib/giveaways/draw-winners";
import { notifyGiveawayWinner } from "@/lib/email/giveaway-notify";

export async function performGiveawayDraw(
  admin: SupabaseClient,
  giveawayId: string,
  options?: {
    skipEndCheck?: boolean;
    notifyAllWinners?: boolean;
    signatureId?: string;
  },
): Promise<{ winnerCount: number; winnerIds: string[] }> {
  const { data: g } = await admin
    .from("giveaways")
    .select("id,title,status,ends_at,is_year_end_lottery")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!g) throw new Error("Gewinnspiel nicht gefunden.");

  const ended = new Date(g.ends_at).getTime() < Date.now();
  if (!options?.skipEndCheck && !ended && g.status === "active") {
    throw new Error("Gewinnspiel läuft noch – Auslosung erst nach Ende.");
  }

  const { data: existing } = await admin
    .from("giveaway_winners")
    .select("id")
    .eq("giveaway_id", giveawayId)
    .limit(1);
  if (existing?.length) throw new Error("Gewinner wurden bereits ermittelt.");

  const { data: prizes } = await admin
    .from("giveaway_prizes")
    .select("id,sort_order,name")
    .eq("giveaway_id", giveawayId)
    .order("sort_order", { ascending: true });

  if (!prizes?.length) throw new Error("Mindestens ein Preis erforderlich.");

  const { data: entries } = await admin
    .from("giveaway_entries")
    .select("user_id,is_eligible")
    .eq("giveaway_id", giveawayId)
    .eq("is_eligible", true);

  const picks = pickGiveawayWinners(prizes ?? [], entries ?? []);
  if (!picks.length) throw new Error("Keine berechtigten Teilnehmer für die Auslosung.");

  const { data: inserted, error: insErr } = await admin
    .from("giveaway_winners")
    .insert(
      picks.map((p) => ({
        giveaway_id: giveawayId,
        prize_id: p.prize_id,
        user_id: p.user_id,
      })),
    )
    .select("id,user_id,prize_id");
  if (insErr) throw new Error(insErr.message);

  await admin
    .from("giveaways")
    .update({
      status: "drawn",
      winners_drawn_at: new Date().toISOString(),
    })
    .eq("id", giveawayId);

  if (options?.notifyAllWinners) {
    const prizeMap = new Map((prizes ?? []).map((p) => [p.id, p]));
    for (const w of inserted ?? []) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email,first_name")
        .eq("id", w.user_id)
        .maybeSingle();
      const email = profile?.email?.trim();
      if (!email) continue;
      const prizeRow = prizeMap.get(w.prize_id);
      try {
        await notifyGiveawayWinner({
          winnerEmail: email,
          firstName: profile?.first_name?.trim() || "Fan",
          giveawayTitle: g.title ?? "Gewinnspiel",
          prizeName: prizeRow?.name ?? "Preis",
          signatureId: options.signatureId,
        });
        await admin
          .from("giveaway_winners")
          .update({ winner_notified_at: new Date().toISOString() })
          .eq("id", w.id);
      } catch (e) {
        console.error("[giveaway] Gewinner-Mail fehlgeschlagen:", w.id, e);
      }
    }
  }

  return {
    winnerCount: picks.length,
    winnerIds: (inserted ?? []).map((w) => w.id),
  };
}
