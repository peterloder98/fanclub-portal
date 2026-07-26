import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CLUB_BANK } from "@/lib/payments/club-bank";
import type { BankTransferPublicConfig, PaymentProvider, PaymentSettingsRow } from "@/lib/payments/types";

const ENV_STRIPE_PUBLIC = process.env.STRIPE_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? "";
const ENV_STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? "";
const ENV_PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const ENV_PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";

const BANK_PUBLIC_CONFIG: BankTransferPublicConfig = {
  account_holder: CLUB_BANK.account_holder,
  iban: CLUB_BANK.iban,
  bic: CLUB_BANK.bic,
  bank_name: CLUB_BANK.bank_name,
};

function bankOnlyFallback(): PaymentSettingsRow[] {
  return [
    {
      provider: "bank_transfer",
      is_enabled: true,
      is_test_mode: false,
      public_config_json: { ...BANK_PUBLIC_CONFIG },
    },
  ];
}

/**
 * Öffentliche Zahlungsarten für Checkout.
 * Derzeit bewusst nur Banküberweisung — andere Anbieter bleiben im Code, sind aber deaktiviert.
 */
export async function listEnabledPaymentMethods(): Promise<PaymentSettingsRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("payment_settings")
    .select("provider,is_enabled,is_test_mode,public_config_json")
    .eq("provider", "bank_transfer")
    .eq("is_enabled", true)
    .order("provider");

  if (error) {
    if (/payment_settings|does not exist/i.test(error.message)) return bankOnlyFallback();
    throw new Error(error.message);
  }

  if (!data?.length) return bankOnlyFallback();

  return (data as PaymentSettingsRow[]).map((row) => ({
    ...row,
    public_config_json: {
      ...BANK_PUBLIC_CONFIG,
      ...(row.public_config_json as BankTransferPublicConfig),
    },
  }));
}

export async function getBankTransferDetails(): Promise<BankTransferPublicConfig> {
  const methods = await listEnabledPaymentMethods();
  const bank = methods.find((m) => m.provider === "bank_transfer");
  const cfg = (bank?.public_config_json ?? {}) as BankTransferPublicConfig;
  return {
    account_holder: cfg.account_holder ?? CLUB_BANK.account_holder,
    iban: cfg.iban ?? CLUB_BANK.iban,
    bic: cfg.bic ?? CLUB_BANK.bic,
    bank_name: cfg.bank_name ?? CLUB_BANK.bank_name,
  };
}

/** Nur serverseitig — niemals an Client senden. (Legacy für spätere Reaktivierung.) */
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
