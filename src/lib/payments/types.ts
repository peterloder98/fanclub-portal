export type PaymentMethod =
  | "bank_transfer"
  | "paypal"
  | "stripe"
  | "apple_pay"
  | "amazon_pay";

export type PaymentType = "shop_order" | "membership_fee" | "other";

export type PaymentStatus =
  | "open"
  | "pending"
  | "simulated"
  | "paid"
  | "cancelled"
  | "failed";

export type BookkeepingStatus = "open" | "paid" | "cancelled";

export type PaymentProvider = PaymentMethod;

export type BankTransferPublicConfig = {
  account_holder: string;
  iban: string;
  bic: string;
  bank_name?: string;
};

export type PaymentSettingsRow = {
  provider: PaymentProvider;
  is_enabled: boolean;
  is_test_mode: boolean;
  public_config_json: Record<string, unknown>;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  membership_id: string | null;
  amount_cents: number;
  currency: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  provider_reference: string | null;
  internal_reference: string;
  due_date: string | null;
  paid_at: string | null;
  manually_confirmed_by: string | null;
  manually_confirmed_at: string | null;
  admin_note: string | null;
  receipt_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentCheckoutResult = {
  paymentId: string;
  orderId?: string;
  applicationId?: string;
  internalReference: string;
  amountCents: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  testModeMessage?: string;
  bankDetails?: BankTransferPublicConfig;
  simulatedProviderReference?: string;
};
