import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isHiddenProfileId } from "@/lib/members/hidden";
import { receivesCommunityEmails } from "@/lib/members/no-app-access";

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

  const full = await admin
    .from("profiles")
    .select("id,email,first_name,no_app_access")
    .in("id", userIds);
  let profiles = full.data;
  if (full.error) {
    if (!/no_app_access|does not exist/i.test(full.error.message)) {
      throw new Error(full.error.message);
    }
    const fb = await admin.from("profiles").select("id,email,first_name").in("id", userIds);
    if (fb.error) throw new Error(fb.error.message);
    profiles = (fb.data ?? []) as typeof profiles;
  }

  const out: ActiveMemberRecipient[] = [];
  for (const p of profiles ?? []) {
    if (isHiddenProfileId(p.id)) continue;
    if (!receivesCommunityEmails(p)) continue;
    const email = p.email!.trim();
    out.push({
      userId: p.id,
      email,
      firstName: p.first_name?.trim() || "Fan",
    });
  }

  return out;
}
