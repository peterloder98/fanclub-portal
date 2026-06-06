import { getProviderSecrets, listEnabledPaymentMethods, isProviderTestMode } from "@/lib/payments/config";
import type { PaymentCheckoutResult } from "@/lib/payments/types";

const TEST_MODE_HINT =
  "PayPal ist im Testmodus vorbereitet. Zahlung wurde noch nicht echt ausgeführt.";

/** Vorbereitet echte PayPal-Integration — aktuell nur Simulation. */
export async function preparePayPalCheckout(input: {
  paymentId: string;
  internalReference: string;
  amountCents: number;
}): Promise<Pick<PaymentCheckoutResult, "testModeMessage" | "simulatedProviderReference">> {
  const methods = await listEnabledPaymentMethods();
  const paypal = methods.find((m) => m.provider === "paypal");
  const secrets = getProviderSecrets("paypal");

  if (!paypal?.is_enabled) {
    throw new Error("PayPal ist derzeit nicht verfügbar.");
  }

  const testMode = isProviderTestMode(paypal) || secrets.isPlaceholder;
  if (!testMode) {
    throw new Error("PayPal Live-Modus ist noch nicht freigeschaltet.");
  }

  return {
    testModeMessage: TEST_MODE_HINT,
    simulatedProviderReference: `paypal_sim_${input.paymentId.slice(0, 8)}`,
  };
}
