import { getBankTransferDetails } from "@/lib/payments/config";
import type { PaymentCheckoutResult } from "@/lib/payments/types";

export async function prepareBankTransferCheckout(input: {
  paymentId: string;
  internalReference: string;
  amountCents: number;
  orderId?: string;
}): Promise<Pick<PaymentCheckoutResult, "bankDetails" | "testModeMessage">> {
  const bankDetails = await getBankTransferDetails();
  return {
    bankDetails: {
      ...bankDetails,
    },
    testModeMessage: undefined,
  };
}
