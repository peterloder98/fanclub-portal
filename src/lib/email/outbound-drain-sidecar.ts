import type { SupabaseClient } from "@supabase/supabase-js";
import { drainOutboundEmailQueue } from "@/lib/email/outbound-queue";
import { scheduleOutboundDrainContinuation } from "@/lib/email/kick-outbound-drain";

/**
 * Mitlaufender Mail-Drain für Tages-Crons (Backup; Live-Enqueue kickt Drain sofort).
 * Ein Chunk inline; Rest über HTTP-Hintergrund-Cron (kein Proxy-Timeout).
 */
export async function runOutboundEmailDrainSidecar(admin: SupabaseClient) {
  try {
    const result = await drainOutboundEmailQueue(admin);
    if (result.pending > 0 && !result.abortedAuth && result.processed > 0) {
      scheduleOutboundDrainContinuation();
    }
    return result;
  } catch (error) {
    console.error("[outbound-queue] sidecar drain failed:", error);
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
