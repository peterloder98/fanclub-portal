export function isRealMemberEmail(email: string | null | undefined): email is string {
  const e = email?.trim().toLowerCase() ?? "";
  if (!e || !e.includes("@")) return false;
  if (/noemail|fanclub-import\.invalid|@invalid$/i.test(e)) return false;
  return true;
}
