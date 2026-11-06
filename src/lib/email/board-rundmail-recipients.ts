import { isRealMemberEmail } from "@/lib/email/is-real-member-email";
import { receivesCommunityEmails } from "@/lib/members/no-app-access";
import { isHiddenProfileId } from "@/lib/members/hidden";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RundmailRecipient = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  no_app_access?: boolean | null;
  is_hidden?: boolean | null;
};

async function loadProfiles(userIds: string[]): Promise<ProfileRow[]> {
  const admin = createSupabaseAdminClient();
  const rows: ProfileRow[] = [];
  for (let i = 0; i < userIds.length; i += 150) {
    const chunk = userIds.slice(i, i + 150);
    const full = await admin
      .from("profiles")
      .select("id,email,first_name,last_name,no_app_access,is_hidden")
      .in("id", chunk);
    if (!full.error) {
      rows.push(...((full.data ?? []) as ProfileRow[]));
      continue;
    }
    if (!/no_app_access|is_hidden|does not exist/i.test(full.error.message)) {
      throw new Error(full.error.message);
    }
    const fallback = await admin.from("profiles").select("id,email,first_name,last_name").in("id", chunk);
    if (fallback.error) throw new Error(fallback.error.message);
    rows.push(...((fallback.data ?? []) as ProfileRow[]));
  }
  return rows;
}

/**
 * Aktive Mitglieder mit eigener E-Mail.
 * Ohne versteckte Profile, ohne App-Zugang-Platzhalter und ohne ruhende Mitgliedschaften.
 */
export async function listRundmailRecipients(): Promise<RundmailRecipient[]> {
  const admin = createSupabaseAdminClient();
  const { data: memberships, error } = await admin.from("memberships").select("user_id").eq("status", "active");
  if (error) throw new Error(error.message);

  const userIds = [...new Set((memberships ?? []).map((row) => row.user_id).filter(Boolean))] as string[];
  if (!userIds.length) return [];

  const profiles = await loadProfiles(userIds);
  const out: RundmailRecipient[] = [];
  for (const profile of profiles) {
    if (!profile.id || isHiddenProfileId(profile.id) || profile.is_hidden) continue;
    if (!receivesCommunityEmails(profile)) continue;
    const email = profile.email?.trim() ?? "";
    if (!isRealMemberEmail(email)) continue;
    out.push({
      userId: profile.id,
      email,
      firstName: profile.first_name?.trim() || "",
      lastName: profile.last_name?.trim() || "",
    });
  }

  out.sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName, "de", { sensitivity: "base" });
    if (last) return last;
    return a.firstName.localeCompare(b.firstName, "de", { sensitivity: "base" });
  });
  return out;
}
