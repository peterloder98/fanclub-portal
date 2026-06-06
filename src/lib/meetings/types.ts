import type { EventTravelInfo } from "@/lib/events/travel-info";

export type ClubMeetingRow = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  schedule: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  travel_info: EventTravelInfo | Record<string, unknown>;
  cost_cents: number | null;
  cost_label: string | null;
  payment_deadline_days: number;
  status: string;
};

export type ClubMeetingListItem = ClubMeetingRow & {
  participantCount: number;
  joined: boolean;
  chargeCents?: number | null;
  chargeStatus?: string | null;
  paymentDueAt?: string | null;
};

export type MeetingParticipantRow = {
  userId: string;
  name: string;
  email: string | null;
  membershipNumber: string | null;
  joinedAt: string;
  chargeCents: number | null;
  chargeStatus: string;
  paymentDueAt: string | null;
};
