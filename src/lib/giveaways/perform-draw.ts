import type { SupabaseClient } from "@supabase/supabase-js";
import { pickGiveawayWinners } from "@/lib/giveaways/draw-winners";
import { notifyGiveawayWinner } from "@/lib/email/giveaway-notify";
import { createUserNotification, notifyAllAdmins } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { auditLog } from "@/lib/admin/audit-log";

/**
 * Atomarer Claim gegen Doppel-Auslosung (Race).
 * winners_drawn_at wird als Sperre genutzt; bei Fehler wieder freigegeben.
 */
async function claimGiveawayDraw(
  admin: SupabaseClient,
  giveawayId: string,
): Promise<{ id: string; title: string | null; status: string; ends_at: string }> {
  const claimTs = new Date().toISOString();
  const { data: claimed, error } = await admin
    .from("giveaways")
    .update({ winners_drawn_at: claimTs })
    .eq("id", giveawayId)
    .is("winners_drawn_at", null)
    .select("id,title,status,ends_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (claimed) return claimed;

  const { data: existingWinners } = await admin
    .from("giveaway_winners")
    .select("id")
    .eq("giveaway_id", giveawayId)
    .limit(1);
  if (existingWinners?.length) {
    await admin
      .from("giveaways")
      .update({ status: "drawn" })
      .eq("id", giveawayId)
      .neq("status", "drawn");
    throw new Error("Gewinner wurden bereits ermittelt.");
  }

  const { data: row } = await admin
    .from("giveaways")
    .select("id,winners_drawn_at,status")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!row) throw new Error("Gewinnspiel nicht gefunden.");
  throw new Error("Auslosung läuft bereits oder wurde unterbrochen — bitte kurz warten und erneut versuchen.");
}

async function releaseGiveawayDrawClaim(admin: SupabaseClient, giveawayId: string) {
  // Claim freigeben nur wenn noch keine Gewinner geschrieben wurden
  const { data: winners } = await admin
    .from("giveaway_winners")
    .select("id")
    .eq("giveaway_id", giveawayId)
    .limit(1);
  if (winners?.length) return;

  await admin
    .from("giveaways")
    .update({ winners_drawn_at: null })
    .eq("id", giveawayId)
    .neq("status", "drawn");
}

export async function performGiveawayDraw(
  admin: SupabaseClient,
  giveawayId: string,
  options?: {
    skipEndCheck?: boolean;
    notifyAllWinners?: boolean;
    signatureId?: string;
    actorId?: string;
  },
): Promise<{ winnerCount: number; winnerIds: string[] }> {
  const { data: gPre } = await admin
    .from("giveaways")
    .select("id,title,status,ends_at,is_year_end_lottery,winners_drawn_at")
    .eq("id", giveawayId)
    .maybeSingle();
  if (!gPre) throw new Error("Gewinnspiel nicht gefunden.");

  const ended = new Date(gPre.ends_at).getTime() < Date.now();
  if (!options?.skipEndCheck && !ended && gPre.status === "active") {
    throw new Error("Gewinnspiel läuft noch – Auslosung erst nach Ende.");
  }

  const { data: existingEarly } = await admin
    .from("giveaway_winners")
    .select("id")
    .eq("giveaway_id", giveawayId)
    .limit(1);
  if (existingEarly?.length) {
    if (gPre.status !== "drawn") {
      await admin
        .from("giveaways")
        .update({
          status: "drawn",
          winners_drawn_at: gPre.winners_drawn_at ?? new Date().toISOString(),
        })
        .eq("id", giveawayId);
    }
    throw new Error("Gewinner wurden bereits ermittelt.");
  }

  const g = await claimGiveawayDraw(admin, giveawayId);

  try {
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

    const eligible = entries ?? [];
    const picks = pickGiveawayWinners(prizes, eligible);
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

    const { error: statusErr } = await admin
      .from("giveaways")
      .update({
        status: "drawn",
        winners_drawn_at: new Date().toISOString(),
      })
      .eq("id", giveawayId);
    if (statusErr) throw new Error(statusErr.message);

    if (options?.actorId) {
      await auditLog({
        actorId: options.actorId,
        action: "giveaway.draw",
        entityType: "giveaway",
        entityId: giveawayId,
        summary: `Auslosung „${g.title ?? giveawayId}“ — ${picks.length} Gewinner`,
        metadata: {
          eligible_count: eligible.length,
          prize_count: prizes.length,
          winner_user_ids: picks.map((p) => p.user_id),
          prize_ids: picks.map((p) => p.prize_id),
          year_end: Boolean(gPre.is_year_end_lottery),
        },
      });
    } else {
      console.info(
        "[giveaway.draw]",
        giveawayId,
        `eligible=${eligible.length}`,
        `winners=${picks.map((p) => p.user_id).join(",")}`,
      );
    }

    const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
      /\/$/,
      "",
    );

    for (const w of inserted ?? []) {
      const prizeRow = prizes.find((p) => p.id === w.prize_id);
      await createUserNotification({
        userId: w.user_id,
        kind: NOTIFICATION_KINDS.giveawayWon,
        title: "Gewinnspiel gewonnen!",
        body: `Du hast bei „${g.title ?? "Gewinnspiel"}" gewonnen: ${prizeRow?.name ?? "Preis"}.`,
        linkUrl: base ? `${base}/giveaways/${giveawayId}` : `/giveaways/${giveawayId}`,
        linkLabel: "Details",
        metadata: { giveaway_id: giveawayId, prize_id: w.prize_id },
      }).catch(console.error);
    }

    await notifyAllAdmins({
      kind: NOTIFICATION_KINDS.giveawayEnded,
      title: "Gewinnspiel ausgelost",
      body: `„${g.title ?? "Gewinnspiel"}“ — ${picks.length} Gewinner ermittelt.`,
      linkUrl: base ? `${base}/giveaways/${giveawayId}` : `/giveaways/${giveawayId}`,
      linkLabel: "Auslosung ansehen",
      metadata: { giveaway_id: giveawayId, winner_count: picks.length },
    }).catch(console.error);

    if (options?.notifyAllWinners) {
      const prizeMap = new Map(prizes.map((p) => [p.id, p]));
      for (const w of inserted ?? []) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email,first_name,gender")
          .eq("id", w.user_id)
          .maybeSingle();
        const email = profile?.email?.trim();
        if (!email) continue;
        const prizeRow = prizeMap.get(w.prize_id);
        try {
          const mail = await notifyGiveawayWinner({
            winnerEmail: email,
            firstName: profile?.first_name?.trim() || "Fan",
            gender: profile?.gender,
            giveawayTitle: g.title ?? "Gewinnspiel",
            prizeName: prizeRow?.name ?? "Preis",
            signatureId: options.signatureId,
          });
          if (mail.ok) {
            await admin
              .from("giveaway_winners")
              .update({ winner_notified_at: new Date().toISOString() })
              .eq("id", w.id);
          } else {
            console.error(
              "[giveaway] Gewinner-Mail nicht gesendet:",
              w.id,
              mail.skipped ? mail.reason : mail.error,
            );
          }
        } catch (e) {
          console.error("[giveaway] Gewinner-Mail fehlgeschlagen:", w.id, e);
        }
      }
    }

    return {
      winnerCount: picks.length,
      winnerIds: (inserted ?? []).map((w) => w.id),
    };
  } catch (e) {
    await releaseGiveawayDrawClaim(admin, giveawayId);
    throw e;
  }
}
