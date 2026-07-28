import { getMembershipApplicationFormUrl } from "@/lib/membership/application-form-url";

const REFERRER_QUERY = "werber";
const INVITE_QUERY = "einladung";

export function getMembershipApplicationFormUrlForReferrer(
  referrerUserId: string,
  referralToken?: string | null,
) {
  const base = getMembershipApplicationFormUrl();
  const id = referrerUserId.trim();
  const params = new URLSearchParams();
  if (id) params.set(REFERRER_QUERY, id);
  const token = referralToken?.trim();
  if (token) params.set(INVITE_QUERY, token);
  const qs = params.toString();
  if (!qs) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${qs}`;
}

export const MEMBERSHIP_REFERRER_STORAGE_KEY = "fc_membership_werber";

export function readReferrerIdFromSearchParams(search: string) {
  const id = new URLSearchParams(search).get(REFERRER_QUERY)?.trim();
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export function readReferralTokenFromSearchParams(search: string) {
  const token = new URLSearchParams(search).get(INVITE_QUERY)?.trim();
  return token && /^[0-9a-f-]{36}$/i.test(token) ? token : null;
}
