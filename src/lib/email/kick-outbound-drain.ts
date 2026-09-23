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
 * Startet den nächsten Drain-Chunk als eigene Request (Vercel maxDuration),
 * damit große Warteschlangen (z. B. ~100 Live-Einladungen) weiterlaufen,
 * ohne das Throttling zu umgehen.
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

/**
 * Ein Drain-Lauf; bei Rest-Pending (und Fortschritt) asynchron weiterketten.
 * Für Live-Create / Resend: Kick über scheduleOutboundDrainContinuation().
 */
export async function kickOutboundEmailDrain(admin: SupabaseClient) {
  try {
    const result = await drainOutboundEmailQueue(admin);
    if (result.pending > 0 && !result.abortedAuth && result.processed > 0) {
      // after(): Fetch überlebt das Response-Ende der Cron-Route.
      after(() => {
        scheduleOutboundDrainContinuation();
      });
    }
    return result;
  } catch (error) {
    console.error("[outbound-queue] kick drain failed:", error);
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      abortedAuth: false,
      pending: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
