"use client";

import { ApplicationPaymentCheckout } from "@/components/payments/application-payment-checkout";

export function AusstehendPaymentClient({
  applicationId,
  paymentToken,
  feeCents,
  firstName,
}: {
  applicationId: string;
  paymentToken: string;
  feeCents: number;
  firstName: string | null;
}) {
  return (
    <ApplicationPaymentCheckout
      applicationId={applicationId}
      paymentToken={paymentToken}
      feeCents={feeCents}
      applicantFirstName={firstName}
    />
  );
}
