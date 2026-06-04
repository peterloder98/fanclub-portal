import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActiveMemberRecipient = {
  userId: string;
  email: string;
  firstName: string;
};

/** Aktive Mitglieder mit E-Mail (keine Antragsteller mit status applied/inactive). */
export async function listActiveMemberRecipients(): Promise<ActiveMemberRecipient[]> {
  const admin = createSupabaseAdminClient();

  const { data: memberships, error: mErr } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  if (mErr) throw new Error(mErr.message);

  const userIds = [...new Set((memberships ?? []).map((m) => m.user_id).filter(Boolean))];
  if (!userIds.length) return [];

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id,email,first_name")
    .in("id", userIds);
  if (pErr) throw new Error(pErr.message);

  const out: ActiveMemberRecipient[] = [];
  for (const p of profiles ?? []) {
    const email = p.email?.trim();
    if (!email || !email.includes("@")) continue;
    out.push({
      userId: p.id,
      email,
      firstName: p.first_name?.trim() || "Fan",
    });
  }

  return out;
}
