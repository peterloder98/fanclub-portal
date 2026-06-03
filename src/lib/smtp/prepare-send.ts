import { repairDefaultSmtpPasswordFromEnv, seedSmtpFromEnvIfEmpty } from "@/lib/smtp/accounts";

export async function prepareSmtpForSend() {
  await seedSmtpFromEnvIfEmpty();
  await repairDefaultSmtpPasswordFromEnv();
}
