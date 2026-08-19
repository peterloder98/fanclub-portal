import { getAppSetting, setAppSetting } from "@/lib/settings/app-settings";
import { isAssignedMembershipNumber } from "@/lib/membership/numbers";

export const MEMBERSHIP_NUMBER_RESERVATIONS_KEY = "membership_number_reservations";

export type MembershipNumberReservations = Record<string, string>;

function parseReservations(raw: string | null): MembershipNumberReservations {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: MembershipNumberReservations = {};
    for (const [userId, number] of Object.entries(parsed)) {
      const n = String(number ?? "").trim();
      if (userId && isAssignedMembershipNumber(n)) out[userId] = n;
    }
    return out;
  } catch {
    return {};
  }
}

export async function getMembershipNumberReservations(): Promise<MembershipNumberReservations> {
  const raw = await getAppSetting(MEMBERSHIP_NUMBER_RESERVATIONS_KEY);
  return parseReservations(raw);
}

export async function getReservedMembershipNumber(userId: string): Promise<string | null> {
  const map = await getMembershipNumberReservations();
  return map[userId]?.trim() || null;
}

export async function setMembershipNumberReservation(userId: string, number: string) {
  const trimmed = number.trim();
  if (!isAssignedMembershipNumber(trimmed)) {
    throw new Error("Ungültige Mitgliedsnummer.");
  }
  const map = await getMembershipNumberReservations();
  map[userId] = trimmed;
  await setAppSetting(MEMBERSHIP_NUMBER_RESERVATIONS_KEY, JSON.stringify(map));
}

export async function consumeMembershipNumberReservation(userId: string) {
  const map = await getMembershipNumberReservations();
  if (!(userId in map)) return;
  delete map[userId];
  await setAppSetting(MEMBERSHIP_NUMBER_RESERVATIONS_KEY, JSON.stringify(map));
}
