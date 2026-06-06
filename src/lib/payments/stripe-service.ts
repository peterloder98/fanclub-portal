import { getProviderSecrets, listEnabledPaymentMethods, isProviderTestMode } from "@/lib/payments/config";
import type { PaymentCheckoutResult } from "@/lib/payments/types";

const TEST_MODE_HINT =
  "Stripe ist im Testmodus vorbereitet. Zahlung wurde noch nicht echt ausgeführt.";

/** Vorbereitet echte Stripe-Integration — aktuell nur Simulation. */
export async function prepareStripeCheckout(input: {
  paymentId: string;
  internalReference: string;
  amountCents: number;
}): Promise<Pick<PaymentCheckoutResult, "testModeMessage" | "simulatedProviderReference">> {
  const methods = await listEnabledPaymentMethods();
  const stripe = methods.find((m) => m.provider === "stripe");
  const secrets = getProviderSecrets("stripe");

  if (!stripe?.is_enabled) {
    throw new Error("Stripe ist derzeit nicht verfügbar.");
  }

  const testMode = isProviderTestMode(stripe) || secrets.isPlaceholder;
  if (!testMode) {
    // Später: Stripe Checkout Session erstellen — aktuell bewusst nicht aktiv
    throw new Error("Stripe Live-Modus ist noch nicht freigeschaltet.");
  }

  return {
    testModeMessage: TEST_MODE_HINT,
    simulatedProviderReference: `stripe_sim_${input.paymentId.slice(0, 8)}`,
  };
}
