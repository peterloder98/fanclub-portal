import type { SupabaseClient } from "@supabase/supabase-js";
import { drainOutboundEmailQueue } from "@/lib/email/outbound-queue";

/** Mitlaufender Mail-Drain für Tages-Crons (Backup; Live-Enqueue kickt Drain sofort). */
export async function runOutboundEmailDrainSidecar(admin: SupabaseClient) {
  try {
    return await drainOutboundEmailQueue(admin);
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
