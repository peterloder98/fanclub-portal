import { getMembershipApplicationFormUrl } from "@/lib/membership/application-form-url";

const REFERRER_QUERY = "werber";

export function getMembershipApplicationFormUrlForReferrer(referrerUserId: string) {
  const base = getMembershipApplicationFormUrl();
  const id = referrerUserId.trim();
  if (!id) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${REFERRER_QUERY}=${encodeURIComponent(id)}`;
}

export const MEMBERSHIP_REFERRER_STORAGE_KEY = "fc_membership_werber";

export function readReferrerIdFromSearchParams(search: string) {
  const id = new URLSearchParams(search).get(REFERRER_QUERY)?.trim();
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
