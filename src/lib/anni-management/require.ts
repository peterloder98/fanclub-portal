import { redirect } from "next/navigation";
import { getRequestMeProfile } from "@/lib/auth/request-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canAccessAnniManagementFinance,
  canInviteAnniManagementUsers,
  isAnniManagementOnlyUser,
  type AnniMgmtAccessProfile,
} from "@/lib/anni-management/access";

export type AnniMgmtGate = {
  userId: string;
  access: AnniMgmtAccessProfile;
  canInvite: boolean;
  managementOnly: boolean;
};

async function loadAccessFlags(userId: string, role: string | null): Promise<AnniMgmtAccessProfile> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,role,is_management,browse_only")
    .eq("id", userId)
    .maybeSingle();

  if (error && /is_management|browse_only|does not exist/i.test(error.message)) {
    return { userId, role, isManagement: false, browseOnly: false };
  }

  return {
    userId,
    role: data?.role ?? role,
    isManagement: Boolean((data as { is_management?: boolean } | null)?.is_management),
    browseOnly: Boolean((data as { browse_only?: boolean } | null)?.browse_only),
  };
}

export async function getAnniManagementAccess(): Promise<AnniMgmtGate | null> {
  const { user, profile } = await getRequestMeProfile();
  if (!user) return null;
  const access = await loadAccessFlags(user.id, profile?.role ?? null);
  if (!canAccessAnniManagementFinance(access)) return null;
  return {
    userId: user.id,
    access,
    canInvite: canInviteAnniManagementUsers(access),
    managementOnly: isAnniManagementOnlyUser(access),
  };
}

export async function requireAnniManagementFinance(): Promise<AnniMgmtGate> {
  const gate = await getAnniManagementAccess();
  if (!gate) {
    const { user } = await getRequestMeProfile();
    if (!user) redirect("/login");
    redirect("/dashboard");
  }
  return gate;
}

export async function requireAnniManagementFinanceAction(): Promise<AnniMgmtGate> {
  const { user, profile } = await getRequestMeProfile();
  if (!user) throw new Error("Nicht angemeldet. Bitte erneut einloggen.");
  const access = await loadAccessFlags(user.id, profile?.role ?? null);
  if (!canAccessAnniManagementFinance(access)) {
    throw new Error("Kein Zugang zu Abrechnung Anni & Management.");
  }
  return {
    userId: user.id,
    access,
    canInvite: canInviteAnniManagementUsers(access),
    managementOnly: isAnniManagementOnlyUser(access),
  };
}

export async function requireAnniManagementInviteAction(): Promise<AnniMgmtGate> {
  const gate = await requireAnniManagementFinanceAction();
  if (!gate.canInvite) {
    throw new Error("Nur Anni oder Peter können Personen hinzufügen.");
  }
  return gate;
}
