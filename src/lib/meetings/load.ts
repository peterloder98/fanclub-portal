import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTravelInfo } from "@/lib/events/travel-info";
import type {
  ClubMeetingListItem,
  ClubMeetingRow,
  MeetingParticipantRow,
} from "@/lib/meetings/types";

const MEETING_SELECT =
  "id,title,summary,body,schedule,starts_at,ends_at,venue,address,postal_code,city,country,travel_info,cost_cents,cost_label,payment_deadline_days,status";

function mapRow(row: Record<string, unknown>): ClubMeetingRow {
  return {
    id: row.id as string,
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    schedule: (row.schedule as string | null) ?? null,
    starts_at: row.starts_at as string,
    ends_at: (row.ends_at as string | null) ?? null,
    venue: (row.venue as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    travel_info: parseTravelInfo(row.travel_info),
    cost_cents: (row.cost_cents as number | null) ?? null,
    cost_label: (row.cost_label as string | null) ?? null,
    payment_deadline_days: Number(row.payment_deadline_days ?? 14),
    status: row.status as string,
  };
}

export async function loadPublishedMeetings(
  supabase: SupabaseClient,
  userId: string,
  opts?: { includePastDays?: number },
): Promise<ClubMeetingListItem[]> {
  const pastDays = opts?.includePastDays ?? 30;
  const since = new Date(Date.now() - pastDays * 86_400_000).toISOString();
  const { data: meetings, error } = await supabase
    .from("club_meetings")
    .select(MEETING_SELECT)
    .eq("status", "published")
    .gte("starts_at", since)
    .order("starts_at", { ascending: true });

  if (error) {
    if (/club_meetings|does not exist/i.test(error.message)) return [];
    throw error;
  }

  const ids = (meetings ?? []).map((m) => m.id);
  const joined = new Set<string>();
  const counts = new Map<string, number>();

  if (ids.length) {
    const { data: parts } = await supabase
      .from("club_meeting_participations")
      .select("meeting_id,user_id")
      .in("meeting_id", ids);
    for (const p of parts ?? []) {
      counts.set(p.meeting_id, (counts.get(p.meeting_id) ?? 0) + 1);
      if (p.user_id === userId) joined.add(p.meeting_id);
    }
  }

  return (meetings ?? []).map((m) => {
    const row = mapRow(m as Record<string, unknown>);
    return {
      ...row,
      participantCount: counts.get(row.id) ?? 0,
      joined: joined.has(row.id),
    };
  });
}

export async function loadMeetingById(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<ClubMeetingListItem | null> {
  const { data, error } = await supabase
    .from("club_meetings")
    .select(MEETING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "published") return null;

  const { count } = await supabase
    .from("club_meeting_participations")
    .select("user_id", { count: "exact", head: true })
    .eq("meeting_id", id);

  const { data: mine } = await supabase
    .from("club_meeting_participations")
    .select("user_id,charge_cents,charge_status,payment_due_at")
    .eq("meeting_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const row = mapRow(data as Record<string, unknown>);
  return {
    ...row,
    participantCount: count ?? 0,
    joined: Boolean(mine),
    chargeCents: (mine?.charge_cents as number | null) ?? null,
    chargeStatus: (mine?.charge_status as string | null) ?? null,
    paymentDueAt: (mine?.payment_due_at as string | null) ?? null,
  };
}

export async function loadMeetingParticipants(
  admin: SupabaseClient,
  meetingId: string,
): Promise<MeetingParticipantRow[]> {
  const { data, error } = await admin
    .from("club_meeting_participations")
    .select(
      "user_id,created_at,charge_cents,charge_status,payment_due_at,profiles(first_name,last_name,email,membership_number)",
    )
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const p = row.profiles as {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      membership_number?: string | null;
    } | null;
    const name =
      p?.first_name && p?.last_name
        ? `${p.first_name} ${p.last_name}`
        : (p?.email ?? "Mitglied");
    return {
      userId: row.user_id as string,
      name,
      email: p?.email ?? null,
      membershipNumber: p?.membership_number ?? null,
      joinedAt: row.created_at as string,
      chargeCents: (row.charge_cents as number | null) ?? null,
      chargeStatus: (row.charge_status as string) ?? "none",
      paymentDueAt: (row.payment_due_at as string | null) ?? null,
    };
  });
}

export function pickNextMeeting(items: ClubMeetingListItem[]) {
  const now = Date.now();
  return items.find((m) => new Date(m.starts_at).getTime() >= now) ?? null;
}
