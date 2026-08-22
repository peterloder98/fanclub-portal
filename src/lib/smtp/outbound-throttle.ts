/** Mindestabstand zwischen zwei SMTP-Mails bei Massenversand (web.de/GMX schützt). */
export function outboundMinIntervalMs(): number {
  const raw = Number(process.env.EMAIL_SMTP_MIN_INTERVAL_MS ?? "4500");
  return Number.isFinite(raw) && raw >= 1000 ? raw : 4500;
}

/** Nach so vielen Mails kurz pausieren. */
export function outboundBurstEvery(): number {
  const raw = Number(process.env.EMAIL_SMTP_BURST_EVERY ?? "8");
  return Number.isFinite(raw) && raw >= 2 ? Math.floor(raw) : 8;
}

export function outboundBurstPauseMs(): number {
  const raw = Number(process.env.EMAIL_SMTP_BURST_PAUSE_MS ?? "60000");
  return Number.isFinite(raw) && raw >= 5000 ? raw : 60_000;
}

/** Pro Cron-Lauf / Drain maximal so viele Mails. */
export function outboundDrainLimit(): number {
  const raw = Number(process.env.EMAIL_OUTBOUND_DRAIN_LIMIT ?? "10");
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 10;
}

export function isSmtpAuthFailure(message: string): boolean {
  return /535|authentication credentials invalid|authentication failed|invalid login/i.test(
    message,
  );
}

export function isSmtpRateOrPolicyBlock(message: string): boolean {
  return (
    isSmtpAuthFailure(message) ||
    /421|450|452|454|552|554|rate limit|too many|quota exceeded|policy/i.test(message)
  );
}

export async function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Pause zwischen zwei Massen-Mails. `sentInRun` = bereits erfolgreich in diesem Lauf.
 */
export async function paceBulkOutboundEmail(sentInRun: number): Promise<void> {
  if (sentInRun <= 0) return;
  const burstEvery = outboundBurstEvery();
  if (sentInRun > 0 && sentInRun % burstEvery === 0) {
    await sleepMs(outboundBurstPauseMs());
    return;
  }
  await sleepMs(outboundMinIntervalMs());
}
