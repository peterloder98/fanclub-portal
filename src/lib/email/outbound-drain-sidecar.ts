import type { SupabaseClient } from "@supabase/supabase-js";
import { drainOutboundEmailQueue } from "@/lib/email/outbound-queue";

/** Mitlaufender Mail-Drain für Tages-Crons (Vercel Hobby: kein 3-Minuten-Intervall). */
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
