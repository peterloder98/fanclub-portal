import {
  isBrowseOnlyProfileId,
  SYSTEM_HIDDEN_PROFILE_IDS,
} from "@/lib/members/hidden";

/** Peter Loder — einziger System-Admin mit Zugang (nicht der restliche Vorstand). */
export const ANNI_MGMT_PETER_PROFILE_ID = [...SYSTEM_HIDDEN_PROFILE_IDS][0]!;

export const ANNI_MGMT_FINANCE_PATH = "/anni-abrechnung";
export const ANNI_MGMT_FINANCE_TITLE = "Abrechnung Anni & Management";

export type AnniMgmtAccessProfile = {
  userId: string | null | undefined;
  role?: string | null;
  isManagement?: boolean | null;
  browseOnly?: boolean | null;
};

function isExplicitlyDenied(userId: string | null | undefined, browseOnly?: boolean | null) {
  if (!userId) return true;
  if (isBrowseOnlyProfileId(userId)) return true;
  if (browseOnly) return true;
  return false;
}

/** Voller Zugang: Anni (role), Peter (id), Management-Flag. Nie Vorschau, nie normaler Vorstand. */
export function canAccessAnniManagementFinance(input: AnniMgmtAccessProfile): boolean {
  const userId = input.userId?.trim() || null;
  if (isExplicitlyDenied(userId, input.browseOnly)) return false;
  if (userId === ANNI_MGMT_PETER_PROFILE_ID) return true;
  if (input.role === "anni") return true;
  if (input.isManagement) return true;
  return false;
}

/** Jo/Leo-Konten anlegen: nur Peter und Anni, nicht Management selbst. */
export function canInviteAnniManagementUsers(input: AnniMgmtAccessProfile): boolean {
  const userId = input.userId?.trim() || null;
  if (isExplicitlyDenied(userId, input.browseOnly)) return false;
  if (userId === ANNI_MGMT_PETER_PROFILE_ID) return true;
  return input.role === "anni";
}

export function isAnniManagementOnlyUser(input: AnniMgmtAccessProfile): boolean {
  if (!canAccessAnniManagementFinance(input)) return false;
  if (input.userId === ANNI_MGMT_PETER_PROFILE_ID) return false;
  if (input.role === "anni") return false;
  return Boolean(input.isManagement);
}

export function postLoginPathForAnniManagement(input: AnniMgmtAccessProfile, next?: string | null) {
  const requested = next?.trim() || "";
  if (requested && requested !== "/dashboard" && requested.startsWith("/")) {
    return requested;
  }
  if (isAnniManagementOnlyUser(input)) return ANNI_MGMT_FINANCE_PATH;
  return requested || "/dashboard";
}
