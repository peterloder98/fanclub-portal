import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatEur } from "@/lib/club/ledger";

export type OpenMeetingCharge = {
  meetingId: string;
  userId: string;
  chargeCents: number;
  meetingTitle: string;
  meetingStartsAt: string;
  firstName: string;
  lastName: string;
  membershipNumber: string | null;
  paymentDueAt: string | null;
  isOverdue: boolean;
};

export async function listOpenMeetingCharges(): Promise<OpenMeetingCharge[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("club_meeting_participations")
    .select(
      "meeting_id,user_id,charge_cents,payment_due_at,club_meetings(title,starts_at),profiles(first_name,last_name,membership_number)",
    )
    .eq("charge_status", "open")
    .gt("charge_cents", 0);
  if (error) {
    if (/club_meeting|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => {
      const meeting = row.club_meetings as {
        title?: string;
        starts_at?: string;
      } | null;
      const profile = row.profiles as {
        first_name?: string | null;
        last_name?: string | null;
        membership_number?: string | null;
      } | null;
      if (!meeting?.title || !profile) return null;
      const paymentDueAt = (row.payment_due_at as string | null) ?? null;
      return {
        meetingId: row.meeting_id as string,
        userId: row.user_id as string,
        chargeCents: row.charge_cents as number,
        meetingTitle: meeting.title,
        meetingStartsAt: meeting.starts_at ?? "",
        firstName: profile.first_name?.trim() || "Mitglied",
        lastName: profile.last_name?.trim() || "",
        membershipNumber: profile.membership_number ?? null,
        paymentDueAt,
        isOverdue: Boolean(paymentDueAt && new Date(paymentDueAt).getTime() < Date.now()),
      };
    })
    .filter((x): x is OpenMeetingCharge => Boolean(x))
    .sort((a, b) => a.meetingStartsAt.localeCompare(b.meetingStartsAt));
}

export async function listOpenMeetingChargesForUser(userId: string): Promise<OpenMeetingCharge[]> {
  const all = await listOpenMeetingCharges();
  return all.filter((c) => c.userId === userId);
}

export async function applyMeetingChargeOnJoin(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  meetingId: string,
  userId: string,
  costCents: number | null,
) {
  if (!costCents || costCents <= 0) {
    await admin
      .from("club_meeting_participations")
      .update({ charge_cents: null, charge_status: "none" })
      .eq("meeting_id", meetingId)
      .eq("user_id", userId);
    return;
  }
  await admin
    .from("club_meeting_participations")
    .update({
      charge_cents: costCents,
      charge_status: "open",
      paid_ledger_entry_id: null,
    })
    .eq("meeting_id", meetingId)
    .eq("user_id", userId);
}

export async function clearMeetingChargeOnLeave(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  meetingId: string,
  userId: string,
) {
  const { data } = await admin
    .from("club_meeting_participations")
    .select("charge_status")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.charge_status === "paid") {
    throw new Error("Bereits bezahlte Teilnahme kann nicht online abgemeldet werden — bitte Admin kontaktieren.");
  }
}

export async function markMeetingChargePaid(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  meetingId: string,
  userId: string,
  ledgerEntryId: string,
) {
  const { error } = await admin
    .from("club_meeting_participations")
    .update({
      charge_status: "paid",
      paid_ledger_entry_id: ledgerEntryId,
    })
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .eq("charge_status", "open");
  if (error) throw new Error(error.message);
}

export function formatMeetingChargeHint(cents: number) {
  return `Kostenbeitrag: ${formatEur(cents)} (offen — bitte an den Fanclub überweisen).`;
}
