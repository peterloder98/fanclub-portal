/** Geschützte Cron-Endpoints: Bearer oder ?secret= (Legacy Artistflow). */

export function authorizeCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;

  const u = new URL(request.url);
  const secret = u.searchParams.get("secret")?.trim();
  return secret === expected;
}
