import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BankTransferPublicConfig, PaymentProvider, PaymentSettingsRow } from "@/lib/payments/types";

const ENV_STRIPE_PUBLIC = process.env.STRIPE_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? "";
const ENV_STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const ENV_PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const ENV_PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";

/** Öffentliche Zahlungsarten für Checkout (keine Secrets). */
export async function listEnabledPaymentMethods(): Promise<PaymentSettingsRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("payment_settings")
    .select("provider,is_enabled,is_test_mode,public_config_json")
    .eq("is_enabled", true)
    .order("provider");

  if (error) {
    if (/payment_settings|does not exist/i.test(error.message)) return fallbackMethods();
    throw new Error(error.message);
  }

  if (!data?.length) return fallbackMethods();
  return data as PaymentSettingsRow[];
}

function fallbackMethods(): PaymentSettingsRow[] {
  return [
    {
      provider: "bank_transfer",
      is_enabled: true,
      is_test_mode: false,
      public_config_json: {
        account_holder: "Anni Perka Fanclub e.V.",
        iban: "DE00 0000 0000 0000 0000 00",
        bic: "TESTDE00XXX",
        bank_name: "Platzhalter-Bank",
      },
    },
    {
      provider: "paypal",
      is_enabled: true,
      is_test_mode: true,
      public_config_json: {},
    },
    {
      provider: "stripe",
      is_enabled: true,
      is_test_mode: true,
      public_config_json: {},
    },
  ];
}

export async function getBankTransferDetails(): Promise<BankTransferPublicConfig> {
  const methods = await listEnabledPaymentMethods();
  const bank = methods.find((m) => m.provider === "bank_transfer");
  const cfg = (bank?.public_config_json ?? {}) as BankTransferPublicConfig;
  return {
    account_holder: cfg.account_holder ?? "Anni Perka Fanclub e.V.",
    iban: cfg.iban ?? "DE00 0000 0000 0000 0000 00",
    bic: cfg.bic ?? "TESTDE00XXX",
    bank_name: cfg.bank_name ?? "Platzhalter-Bank",
  };
}

/** Nur serverseitig — niemals an Client senden. */
export function getProviderSecrets(provider: PaymentProvider) {
  switch (provider) {
    case "stripe":
      return {
        publicKey: ENV_STRIPE_PUBLIC || "pk_test_placeholder",
        secretKey: ENV_STRIPE_SECRET || "sk_test_placeholder",
        isPlaceholder: !ENV_STRIPE_SECRET || ENV_STRIPE_SECRET.includes("placeholder"),
      };
    case "paypal":
      return {
        clientId: ENV_PAYPAL_CLIENT_ID || "PAYPAL_TEST_CLIENT_ID",
        clientSecret: ENV_PAYPAL_CLIENT_SECRET || "PAYPAL_TEST_CLIENT_SECRET",
        isPlaceholder:
          !ENV_PAYPAL_CLIENT_SECRET || ENV_PAYPAL_CLIENT_SECRET.includes("placeholder"),
      };
    default:
      return {};
  }
}

export function isProviderTestMode(settings: PaymentSettingsRow): boolean {
  if (settings.provider === "bank_transfer") return false;
  return settings.is_test_mode;
}
