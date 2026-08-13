"use client";

import { ApplicationPaymentCheckout } from "@/components/payments/application-payment-checkout";

export function AusstehendPaymentClient({
  applicationId,
  paymentToken,
  feeCents,
  firstName,
  lastName,
  gender,
}: {
  applicationId: string;
  paymentToken: string;
  feeCents: number;
  firstName: string | null;
  lastName?: string | null;
  gender?: string | null;
}) {
  return (
    <ApplicationPaymentCheckout
      applicationId={applicationId}
      paymentToken={paymentToken}
      feeCents={feeCents}
      applicantFirstName={firstName}
      applicantLastName={lastName}
      applicantGender={gender}
    />
  );
}
