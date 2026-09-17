export const ANNI_MGMT_DOCS_BUCKET = "anni-management-docs";
export const DEFAULT_TRAVEL_TO_CLIENT_CENTS = 50_000;
export const COMMISSION_PERCENT = 20;
/** 0,33 € je km (nicht 0,33 Cent). */
export const KM_RATE_CENTS_PER_KM = 33;
/** Quartals-Auszahlung Management-Reise: März, Juni, September, Dezember. */
export const QUARTER_SETTLEMENT_MONTHS = [3, 6, 9, 12] as const;
export const QUARTER_RULE_COPY =
  "Management-Reisekosten werden alle 3 Monate ausgezahlt (März, Juni, September, Dezember). Das kann nach Absprache geändert werden.";

export const DEFAULT_INCOME_TYPES = ["Gage", "GEMA", "GVL"] as const;

export const TRAVEL_MODES = [
  "bahn",
  "flug",
  "zug",
  "auto",
  "hotel",
  "spesen",
  "auslagen",
  "other",
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  bahn: "Bahn",
  flug: "Flug",
  zug: "Zug",
  auto: "Auto (km)",
  hotel: "Hotel",
  spesen: "Spesen",
  auslagen: "Auslagen",
  other: "Sonstiges",
};

export const TRAVELERS = ["anni", "management"] as const;
export type Traveler = (typeof TRAVELERS)[number];

export const TRAVELER_LABELS: Record<Traveler, string> = {
  anni: "Anni",
  management: "Management",
};

export type JobLineKind =
  | "income"
  | "travel_to_client"
  | "extra_client_spesen"
  | "expense_travel"
  | "expense_other";

export const JOB_LINE_KIND_LABELS: Record<JobLineKind, string> = {
  income: "Einnahme (20 %-Bemessung)",
  travel_to_client: "Reisekosten an Kunden (Pool-Zugang)",
  extra_client_spesen: "Zusätzliche Kundenspesen (nicht 20 %)",
  expense_travel: "Reiseausgabe (Pool-Abgang)",
  expense_other: "Sonstige Ausgabe",
};

export type InvoiceStatus = "offen" | "versendet" | "bezahlt" | "überfällig";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  offen: "Offen",
  versendet: "Versendet",
  bezahlt: "Bezahlt",
  überfällig: "Überfällig",
};

export type AnniMgmtJobLine = {
  id: string;
  job_id: string;
  line_kind: JobLineKind;
  income_type: string | null;
  amount_cents: number;
  traveler: Traveler | null;
  travel_mode: TravelMode | null;
  km: number | null;
  route_description: string | null;
  reimbursed_at: string | null;
  reimbursed_year: number | null;
  reimbursed_month: number | null;
  note: string | null;
  created_at: string;
};

export type AnniMgmtJob = {
  id: string;
  performance_date: string;
  label: string;
  description: string | null;
  invoice_due_date: string;
  invoice_sent: boolean;
  invoice_sent_at: string | null;
  paid: boolean;
  paid_at: string | null;
  invoice_pdf_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines: AnniMgmtJobLine[];
};

export type AnniMgmtPoolPayout = {
  id: string;
  payout_date: string;
  amount_cents: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type AnniMgmtMonthSettlement = {
  id: string;
  year: number;
  month: number;
  income_base_cents: number;
  fee_cents: number;
  management_travel_cents: number;
  total_cents: number;
  settled_at: string;
  settled_by: string | null;
};

export type AnniMgmtPerson = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: string | null;
  is_management: boolean;
  is_hidden: boolean;
};

export type PoolMovement = {
  id: string;
  date: string;
  direction: "in" | "out";
  amount_cents: number;
  who: string;
  label: string;
  jobId?: string;
  kind: "travel_to_client" | "expense_travel" | "payout_anni";
};
