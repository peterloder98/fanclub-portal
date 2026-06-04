import type { SupabaseClient } from "@supabase/supabase-js";

/** Werber aus Einladungs-E-Mail (und optional ?werber=) ermitteln. */
export async function resolveMembershipReferrer(
  admin: SupabaseClient,
  applicantEmail: string,
  referrerFromClient?: string | null,
): Promise<string | null> {
  const email = applicantEmail.trim().toLowerCase();
  if (!email) return null;

  const { data: sends } = await admin
    .from("membership_referral_sends")
    .select("sender_id")
    .ilike("recipient_email", email)
    .order("created_at", { ascending: false })
    .limit(5);

  const senderFromEmail = sends?.[0]?.sender_id ?? null;
  const clientId = referrerFromClient?.trim() || null;

  if (clientId && sends?.some((s) => s.sender_id === clientId)) {
    return clientId;
  }

  return senderFromEmail;
}
