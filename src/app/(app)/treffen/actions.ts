"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logMemberActivity, MEMBER_ACTIVITY_TYPES } from "@/lib/membership/activity-log";
import { formatEur } from "@/lib/club/ledger";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

export async function toggleMeetingParticipation(meetingId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const admin = createSupabaseAdminClient();
  const { data: meeting } = await admin
    .from("club_meetings")
    .select("id,title,status,starts_at,cost_cents,cost_label")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting || meeting.status !== "published") {
    throw new Error("Treffen nicht gefunden");
  }

  const { data: existing } = await admin
    .from("club_meeting_participations")
    .select("user_id,charge_status,charge_cents")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );

  if (existing) {
    if (existing.charge_status === "paid") {
      throw new Error(
        "Bezahlte Teilnahme kann nicht online abgemeldet werden — bitte den Fanclub kontaktieren.",
      );
    }
    const { error } = await admin
      .from("club_meeting_participations")
      .delete()
      .eq("meeting_id", meetingId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("club_meeting_participations").insert({
      meeting_id: meetingId,
      user_id: user.id,
    });
    if (error) throw new Error(error.message);

    const costCents = meeting.cost_cents ?? 0;
    if (costCents > 0) {
      await logMemberActivity({
        userId: user.id,
        eventType: MEMBER_ACTIVITY_TYPES.ledgerIncome,
        title: `Fanclub-Treffen: ${formatEur(costCents)} offen`,
        details: `Teilnahme „${meeting.title}" — Kostenbeitrag offen.`,
        linkUrl: base ? `${base}/treffen/${meetingId}` : `/treffen/${meetingId}`,
        linkLabel: "Zum Treffen",
        createdBy: user.id,
        metadata: { meeting_id: meetingId, charge_cents: costCents },
      }).catch(console.error);

      await createUserNotification({
        userId: user.id,
        kind: NOTIFICATION_KINDS.contributionOpen,
        title: "Kostenbeitrag Fanclub-Treffen",
        body: `${meeting.title}: ${formatEur(costCents)} offen — bitte an den Fanclub überweisen.`,
        linkUrl: base ? `${base}/treffen/${meetingId}` : `/treffen/${meetingId}`,
        linkLabel: "Details",
        metadata: { meeting_id: meetingId, charge_cents: costCents },
      }).catch(console.error);
    }
  }

  revalidatePath("/treffen");
  revalidatePath(`/treffen/${meetingId}`);
  revalidatePath("/mitglieder");
  revalidatePath("/dashboard");
  revalidatePath("/admin/accounting");
  revalidatePath(`/admin/members/${user.id}`);
}
