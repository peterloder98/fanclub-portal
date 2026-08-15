/** Server-Action-Fehler in Production sind oft als RSC-Digest maskiert. */
export function userFacingActionError(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (!msg || /Server Components render|digest property/i.test(msg)) {
    return fallback;
  }
  return msg;
}
