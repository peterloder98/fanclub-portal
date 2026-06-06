"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyAllActiveMembers, createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");
  return user;
}

export async function createClubMeeting(formData: FormData) {
  const user = await requireAdmin();
  const admin = createSupabaseAdminClient();

  const title = String(formData.get("title") ?? "").trim();
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
  if (!title || !startsAtRaw) throw new Error("Titel und Beginn sind Pflicht");

  const publish = formData.get("publish") === "on";
  const travelNotes = String(formData.get("travel_notes") ?? "").trim();
  const stationName = String(formData.get("station_name") ?? "").trim();
  const stationAddress = String(formData.get("station_address") ?? "").trim();
  const hotelName = String(formData.get("hotel_name") ?? "").trim();
  const hotelAddress = String(formData.get("hotel_address") ?? "").trim();
  const deadlineDaysRaw = Number(formData.get("payment_deadline_days") ?? 14);
  const paymentDeadlineDays =
    Number.isFinite(deadlineDaysRaw) && deadlineDaysRaw >= 1 && deadlineDaysRaw <= 90
      ? Math.round(deadlineDaysRaw)
      : 14;
  const costEurRaw = String(formData.get("cost_eur") ?? "").trim().replace(",", ".");
  const costCents = costEurRaw ? Math.round(parseFloat(costEurRaw) * 100) : null;
  if (costEurRaw && (!Number.isFinite(costCents) || (costCents ?? 0) < 0)) {
    throw new Error("Ungültiger Kostenbetrag");
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
      summary: String(formData.get("summary") ?? "").trim() || null,
      body: String(formData.get("body") ?? "").trim() || null,
      schedule: String(formData.get("schedule") ?? "").trim() || null,
      starts_at: new Date(startsAtRaw).toISOString(),
      venue: String(formData.get("venue") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      postal_code: String(formData.get("postal_code") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      cost_cents: costCents && costCents > 0 ? costCents : null,
      cost_label: String(formData.get("cost_label") ?? "").trim() || null,
      payment_deadline_days: paymentDeadlineDays,
      travel_info,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id,title,starts_at,city")
    .single();

  if (error) throw new Error(error.message);

  if (publish && data) {
    const dateLabel = new Date(data.starts_at).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
      /\/$/,
      "",
    );
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
}

export async function removeMeetingParticipant(meetingId: string, userId: string) {
  const adminUser = await requireAdmin();
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
}
