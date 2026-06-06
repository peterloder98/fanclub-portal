import { listEnabledPaymentMethods, isProviderTestMode } from "@/lib/payments/config";
import type { PaymentCheckoutResult, PaymentProvider } from "@/lib/payments/types";

const TEST_HINTS: Partial<Record<PaymentProvider, string>> = {
  apple_pay: "Apple Pay ist im Testmodus vorbereitet. Zahlung wurde noch nicht echt ausgeführt.",
  amazon_pay: "Amazon Pay ist im Testmodus vorbereitet. Zahlung wurde noch nicht echt ausgeführt.",
  paypal: "PayPal ist im Testmodus vorbereitet. Zahlung wurde noch nicht echt ausgeführt.",
  stripe: "Stripe ist im Testmodus vorbereitet. Zahlung wurde noch nicht echt ausgeführt.",
};

/** Vorbereitet Wallet-/PSP-Integration — aktuell nur Simulation. */
export async function prepareWalletCheckout(input: {
  provider: PaymentProvider;
  paymentId: string;
  internalReference: string;
  amountCents: number;
}): Promise<Pick<PaymentCheckoutResult, "testModeMessage" | "simulatedProviderReference">> {
  const methods = await listEnabledPaymentMethods();
  const settings = methods.find((m) => m.provider === input.provider);

  if (!settings?.is_enabled) {
    throw new Error("Diese Zahlungsart ist derzeit nicht verfügbar.");
  }

  if (!isProviderTestMode(settings)) {
    throw new Error(`${input.provider} Live-Modus ist noch nicht freigeschaltet.`);
  }

  return {
    testModeMessage: TEST_HINTS[input.provider] ?? "Testmodus — keine echte Zahlung.",
    simulatedProviderReference: `${input.provider}_sim_${input.paymentId.slice(0, 8)}`,
  };
}
