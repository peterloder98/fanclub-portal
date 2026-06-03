export function getMembershipApplicationFormPath() {
  return "/mitgliedschaft";
}

export function getMembershipApplicationFormUrl() {
  const base = (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  ).replace(/\/$/, "");
  const path = getMembershipApplicationFormPath();
  return base ? `${base}${path}` : path;
}
