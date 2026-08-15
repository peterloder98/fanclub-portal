import { getAccountAccessFlowForUser } from "@/lib/auth/account-access-flow";
import { sendAppAccessSetupEmail } from "@/lib/email/app-access-setup";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

/**
 * Sendet je nach Registrierungsstatus Setup- oder Passwort-Reset-Mail.
 * Registrierte Mitglieder bekommen nie wieder die Ersteinrichtung (Geburtsdatum).
 */
export async function sendAccountAccessEmail(input: {
  email: string;
  firstName: string;
  gender?: string | null;
  userId: string;
  logContext?: Record<string, unknown>;
}) {
  const flow = await getAccountAccessFlowForUser(input.userId);
  if (flow === "password_reset") {
    return sendPasswordResetEmail({
      email: input.email,
      firstName: input.firstName,
      gender: input.gender,
      userId: input.userId,
      logContext: {
        ...input.logContext,
        access_flow: "password_reset",
      },
    });
  }
  return sendAppAccessSetupEmail({
    email: input.email,
    firstName: input.firstName,
    gender: input.gender,
    userId: input.userId,
    logContext: {
      ...input.logContext,
      access_flow: "account_setup",
    },
    /** Interne Guard: nicht erneut flow-checken (vermeidet Rekursion). */
    forceSetup: true,
  });
}
