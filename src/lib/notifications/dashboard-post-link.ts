export function dashboardPostLink(postId: string): string {
  const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  const path = `/dashboard?post=${postId}`;
  return base ? `${base}${path}` : path;
}
