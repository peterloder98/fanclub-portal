"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { notifyAllActiveMembers, createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";
import {
  formatBerlinDate,
  parseAdminWallClockToUtcIso,
} from "@/lib/datetime/berlin";

export type CreateClubMeetingInput = {
  title: string;
  summary?: string;
  body?: string;
  schedule?: string;
  /** Europe/Berlin-Wanduhr `YYYY-MM-DDTHH:mm` */
  startsAt: string;
  /** Optionales Ende, gleiche Wanduhr-Form */
  endsAt?: string | null;
  venue?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  /** Wenn false: keine Kosten (cost_cents/cost_label bleiben leer) */
  withCosts?: boolean;
  costEur?: string;
  costLabel?: string;
  paymentDeadlineDays?: string;
  stationName?: string;
  stationAddress?: string;
  hotelName?: string;
  hotelAddress?: string;
  travelNotes?: string;
  publish?: boolean;
};

export type CreateClubMeetingResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createClubMeeting(
  input: CreateClubMeetingInput,
): Promise<CreateClubMeetingResult> {
  try {
    const { user } = await requireAdminAction();
    const admin = createSupabaseAdminClient();

    const title = input.title.trim();
    const startsAtRaw = (input.startsAt ?? "").trim();
    if (!title || !startsAtRaw) {
      return { ok: false, error: "Titel und Beginn sind Pflicht." };
    }

    let starts_at: string;
    try {
      starts_at = parseAdminWallClockToUtcIso(startsAtRaw, "Beginn");
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Beginn: ungültiges Datum.",
      };
    }

    let ends_at: string | null = null;
    const endsAtRaw = (input.endsAt ?? "").trim();
    if (endsAtRaw) {
      try {
        ends_at = parseAdminWallClockToUtcIso(endsAtRaw, "Ende");
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Ende: ungültiges Datum.",
        };
      }
      if (new Date(ends_at).getTime() < new Date(starts_at).getTime()) {
        return { ok: false, error: "Ende muss nach dem Beginn liegen." };
      }
    }

    const publish = Boolean(input.publish);
    const withCosts = Boolean(input.withCosts);
    const travelNotes = (input.travelNotes ?? "").trim();
    const stationName = (input.stationName ?? "").trim();
    const stationAddress = (input.stationAddress ?? "").trim();
    const hotelName = (input.hotelName ?? "").trim();
    const hotelAddress = (input.hotelAddress ?? "").trim();

    const deadlineDaysRaw = Number(String(input.paymentDeadlineDays ?? "14").replace(/\D/g, "") || 14);
    const paymentDeadlineDays =
      Number.isFinite(deadlineDaysRaw) && deadlineDaysRaw >= 1 && deadlineDaysRaw <= 90
        ? Math.round(deadlineDaysRaw)
        : 14;

    let costCents: number | null = null;
    let costLabel: string | null = null;
    if (withCosts) {
      const costEurRaw = String(input.costEur ?? "")
        .trim()
        .replace(",", ".");
      if (costEurRaw) {
        const parsed = Math.round(parseFloat(costEurRaw) * 100);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return { ok: false, error: "Ungültiger Kostenbetrag." };
        }
        costCents = parsed > 0 ? parsed : null;
      }
      costLabel = (input.costLabel ?? "").trim() || null;
    }

    const travel_info = {
      notes: travelNotes || null,
      station:
        stationName || stationAddress
          ? { name: stationName, address: stationAddress, link: null }
          : null,
      hotels:
        hotelName || hotelAddress
          ? [{ name: hotelName, address: hotelAddress, link: null }]
          : [],
    };

    const { data, error } = await admin
      .from("club_meetings")
      .insert({
        title,
        summary: (input.summary ?? "").trim() || null,
        body: (input.body ?? "").trim() || null,
        schedule: (input.schedule ?? "").trim() || null,
        starts_at,
        ends_at,
        venue: (input.venue ?? "").trim() || null,
        address: (input.address ?? "").trim() || null,
        postal_code: (input.postalCode ?? "").trim() || null,
        city: (input.city ?? "").trim() || null,
        cost_cents: costCents,
        cost_label: costLabel,
        payment_deadline_days: paymentDeadlineDays,
        travel_info,
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
        created_by: user.id,
      })
      .select("id,title,starts_at,city")
      .single();

    if (error) return { ok: false, error: error.message };
    if (!data?.id) return { ok: false, error: "Treffen konnte nicht gespeichert werden." };

    if (publish) {
      const dateLabel = formatBerlinDate(data.starts_at);
      const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
        /\/$/,
        "",
      );
      // Nur In-App-Benachrichtigung (Glocke) — kein E-Mail-Massenversand beim Anlegen.
      await notifyAllActiveMembers({
        kind: NOTIFICATION_KINDS.clubMeetingPublished,
        title: "Neues Fanclub Treffen",
        body: `${data.title} — ${dateLabel}${data.city ? `, ${data.city}` : ""}`,
        linkUrl: base ? `${base}/treffen/${data.id}` : `/treffen/${data.id}`,
        linkLabel: "Details ansehen",
        metadata: { meeting_id: data.id, type: "club_meeting" },
      }).catch(console.error);
    }

    revalidatePath("/treffen");
    revalidatePath("/dashboard");
    revalidatePath("/admin/treffen");
    revalidatePath("/mitglieder");
    return { ok: true, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Treffen konnte nicht angelegt werden.",
    };
  }
}

export async function removeMeetingParticipant(meetingId: string, userId: string) {
  try {
    const { user: adminUser } = await requireAdminAction();
    const admin = createSupabaseAdminClient();

    const { data: meeting } = await admin
      .from("club_meetings")
      .select("id,title")
      .eq("id", meetingId)
      .maybeSingle();
    if (!meeting) throw new Error("Treffen nicht gefunden");

    const { data: part } = await admin
      .from("club_meeting_participations")
      .select("charge_status,charge_cents")
      .eq("meeting_id", meetingId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!part) throw new Error("Teilnahme nicht gefunden");

    const { error } = await admin
      .from("club_meeting_participations")
      .delete()
      .eq("meeting_id", meetingId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
      /\/$/,
      "",
    );
    const reason =
      part.charge_status === "open"
        ? "Anmeldung zurückgenommen (Zahlung nicht fristgerecht eingegangen)."
        : "Anmeldung durch Admin zurückgenommen.";

    await logMemberActivity({
      userId,
      eventType: MEMBER_ACTIVITY_TYPES.note,
      title: `Fanclub-Treffen: ${meeting.title}`,
      details: reason,
      linkUrl: base ? `${base}/treffen/${meetingId}` : `/treffen/${meetingId}`,
      linkLabel: "Treffen",
      createdBy: adminUser.id,
      metadata: { meeting_id: meetingId, charge_status: part.charge_status },
    }).catch(console.error);

    await createUserNotification({
      userId,
      kind: NOTIFICATION_KINDS.contributionOpen,
      title: "Teilnahme am Fanclub-Treffen zurückgenommen",
      body: `${meeting.title}: ${reason}`,
      linkUrl: base ? `${base}/treffen/${meetingId}` : `/treffen/${meetingId}`,
      linkLabel: "Details",
      metadata: { meeting_id: meetingId, removed_by_admin: true },
    }).catch(console.error);

    revalidatePath(`/admin/treffen/${meetingId}`);
    revalidatePath(`/treffen/${meetingId}`);
    revalidatePath("/admin/accounting");
    revalidatePath("/mitglieder");
  } catch (e) {
    throw e instanceof Error ? e : new Error("Teilnehmer konnte nicht entfernt werden.");
  }
}
