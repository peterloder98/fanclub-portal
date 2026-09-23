import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { drainOutboundEmailQueue } from "@/lib/email/outbound-queue";

function cronBaseUrl(): string {
  const app = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  if (app) return app;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (!vercel) return "";
  return vercel.startsWith("http") ? vercel : `https://${vercel}`;
}

/**
 * Startet den nächsten Drain als eigene Request.
 * Die Cron-Route antwortet sofort und drain't im after()-Hintergrund —
 * so kein Gateway-504 (FUNCTION_INVOCATION_TIMEOUT).
 */
export function scheduleOutboundDrainContinuation(): void {
  const base = cronBaseUrl();
  const secret = process.env.CRON_SECRET?.trim();
  if (!base || !secret) {
    console.warn(
      "[outbound-queue] chain skip: APP_BASE_URL/NEXT_PUBLIC_APP_URL oder CRON_SECRET fehlt",
    );
    return;
  }
  void fetch(`${base}/api/cron/email-outbound`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  }).catch((error) => {
    console.error("[outbound-queue] chain kick failed:", error);
  });
}

export type OutboundDrainTotals = {
  processed: number;
  sent: number;
  failed: number;
  abortedAuth: boolean;
  pending: number;
  rounds: number;
};

/**
 * Mehrere Drain-Chunks innerhalb eines Zeitbudgets (Throttling bleibt).
 * Bei Rest-Pending: HTTP-Selbst-Kette für den nächsten Serverless-Lauf.
 */
export async function runOutboundDrainUntilBudget(
  admin: SupabaseClient,
  options?: { budgetMs?: number },
): Promise<OutboundDrainTotals> {
  const budgetMs = options?.budgetMs ?? 100_000;
  const started = Date.now();
  const totals: OutboundDrainTotals = {
    processed: 0,
    sent: 0,
    failed: 0,
    abortedAuth: false,
    pending: 0,
    rounds: 0,
  };

  while (Date.now() - started < budgetMs) {
    const result = await drainOutboundEmailQueue(admin);
    totals.rounds += 1;
    totals.processed += result.processed;
    totals.sent += result.sent;
    totals.failed += result.failed;
    totals.abortedAuth = result.abortedAuth;
    totals.pending = result.pending;

    if (result.abortedAuth) break;
    if (result.processed === 0) break;
    if (result.pending <= 0) break;
  }

  if (totals.pending > 0 && !totals.abortedAuth) {
    scheduleOutboundDrainContinuation();
  }
  return totals;
}

/** Für Sidecar / Sync-Aufrufe: ein Chunk, bei Rest asynchron weiterketten. */
export async function kickOutboundEmailDrain(admin: SupabaseClient) {
  try {
    return await runOutboundDrainUntilBudget(admin, { budgetMs: 95_000 });
  } catch (error) {
    console.error("[outbound-queue] kick drain failed:", error);
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      abortedAuth: false,
      pending: 0,
      rounds: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Cron-Route: Arbeit nach Response (kein Proxy-Timeout). */
export function acceptOutboundDrainInBackground(admin: SupabaseClient): void {
  after(() => {
    void runOutboundDrainUntilBudget(admin, { budgetMs: 100_000 }).catch((error) => {
      console.error("[outbound-queue] background drain failed:", error);
    });
  });
}
