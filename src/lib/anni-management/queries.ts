import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AnniMgmtJob,
  AnniMgmtJobLine,
  AnniMgmtMonthSettlement,
  AnniMgmtPerson,
  AnniMgmtPoolPayout,
  JobLineKind,
  TravelMode,
  Traveler,
} from "@/lib/anni-management/types";
import { JOB_LINE_KIND_LABELS, TRAVEL_MODES, TRAVELERS } from "@/lib/anni-management/types";

const LINE_KINDS = new Set(Object.keys(JOB_LINE_KIND_LABELS));

function asLineKind(value: string): JobLineKind {
  if (LINE_KINDS.has(value)) return value as JobLineKind;
  return "expense_other";
}

function asTraveler(value: string | null): Traveler | null {
  if (value && (TRAVELERS as readonly string[]).includes(value)) return value as Traveler;
  return null;
}

function asTravelMode(value: string | null): TravelMode | null {
  if (value && (TRAVEL_MODES as readonly string[]).includes(value)) return value as TravelMode;
  return null;
}

type JobRow = Omit<AnniMgmtJob, "lines">;
type LineRow = Omit<AnniMgmtJobLine, "line_kind" | "traveler" | "travel_mode"> & {
  line_kind: string;
  traveler: string | null;
  travel_mode: string | null;
};

export type AnniMgmtFinanceBundle = {
  jobs: AnniMgmtJob[];
  payouts: AnniMgmtPoolPayout[];
  settlements: AnniMgmtMonthSettlement[];
  incomeTypes: string[];
  people: AnniMgmtPerson[];
  schemaReady: boolean;
  schemaError: string | null;
};

function mapLine(row: LineRow): AnniMgmtJobLine {
  return {
    ...row,
    line_kind: asLineKind(row.line_kind),
    traveler: asTraveler(row.traveler),
    travel_mode: asTravelMode(row.travel_mode),
    km: row.km == null ? null : Number(row.km),
  };
}

export async function loadAnniMgmtFinanceBundle(): Promise<AnniMgmtFinanceBundle> {
  const admin = createSupabaseAdminClient();
  const empty: AnniMgmtFinanceBundle = {
    jobs: [],
    payouts: [],
    settlements: [],
    incomeTypes: ["Gage", "GEMA", "GVL"],
    people: [],
    schemaReady: false,
    schemaError: null,
  };

  const { data: jobRows, error: jobErr } = await admin
    .from("anni_mgmt_jobs")
    .select(
      "id,performance_date,label,description,invoice_due_date,invoice_sent,invoice_sent_at,paid,paid_at,invoice_pdf_path,created_by,created_at,updated_at",
    )
    .order("performance_date", { ascending: false });

  if (jobErr) {
    if (/does not exist|schema cache/i.test(jobErr.message)) {
      return { ...empty, schemaError: jobErr.message };
    }
    throw new Error(jobErr.message);
  }

  const { data: lineRows, error: lineErr } = await admin
    .from("anni_mgmt_job_lines")
    .select(
      "id,job_id,line_kind,income_type,amount_cents,traveler,travel_mode,km,route_description,reimbursed_at,reimbursed_year,reimbursed_month,note,created_at",
    )
    .order("created_at", { ascending: true });
  if (lineErr) throw new Error(lineErr.message);

  const linesByJob = new Map<string, AnniMgmtJobLine[]>();
  for (const raw of (lineRows ?? []) as LineRow[]) {
    const mapped = mapLine(raw);
    const list = linesByJob.get(mapped.job_id) ?? [];
    list.push(mapped);
    linesByJob.set(mapped.job_id, list);
  }

  const jobs: AnniMgmtJob[] = ((jobRows ?? []) as JobRow[]).map((row) => ({
    ...row,
    lines: linesByJob.get(row.id) ?? [],
  }));

  const [{ data: payouts }, { data: settlements }, { data: types }] = await Promise.all([
    admin
      .from("anni_mgmt_pool_payouts")
      .select("id,payout_date,amount_cents,note,created_by,created_at")
      .order("payout_date", { ascending: false }),
    admin
      .from("anni_mgmt_month_settlements")
      .select(
        "id,year,month,income_base_cents,fee_cents,management_travel_cents,total_cents,settled_at,settled_by",
      )
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
    admin.from("anni_mgmt_income_types").select("label,sort_order").order("sort_order"),
  ]);

  let people: AnniMgmtPerson[] = [];
  const peopleRes = await admin
    .from("profiles")
    .select("id,first_name,last_name,email,role,is_management,is_hidden")
    .or("is_management.eq.true,role.eq.anni,id.eq.1b70d88f-e28d-48f3-b3cb-646eaf06f19a")
    .order("first_name");
  if (!peopleRes.error) {
    people = (peopleRes.data ?? []) as AnniMgmtPerson[];
  }

  const incomeTypes = (types ?? []).map((t) => t.label).filter(Boolean);
  if (!incomeTypes.includes("Gage")) incomeTypes.unshift("Gage", "GEMA", "GVL");

  return {
    jobs,
    payouts: (payouts ?? []) as AnniMgmtPoolPayout[],
    settlements: (settlements ?? []) as AnniMgmtMonthSettlement[],
    incomeTypes: Array.from(new Set(incomeTypes)),
    people,
    schemaReady: true,
    schemaError: null,
  };
}
