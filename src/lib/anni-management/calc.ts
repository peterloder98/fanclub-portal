import { BERLIN_TZ } from "@/lib/datetime/berlin";
import { commissionCents } from "@/lib/anni-management/money";
import {
  COMMISSION_PERCENT,
  QUARTER_SETTLEMENT_MONTHS,
  TRAVEL_MODE_LABELS,
  TRAVELER_LABELS,
  type AnniMgmtJob,
  type AnniMgmtJobLine,
  type AnniMgmtMonthSettlement,
  type AnniMgmtPoolPayout,
  type InvoiceStatus,
  type PoolMovement,
  type TravelMode,
} from "@/lib/anni-management/types";

export function berlinTodayIsoDate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: BERLIN_TZ });
}

export function formatIsoDateDe(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

export function yearMonthFromIsoDate(isoDate: string | null | undefined): {
  year: number;
  month: number;
} | null {
  if (!isoDate) return null;
  const m = /^(\d{4})-(\d{2})/.exec(isoDate.slice(0, 10));
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function isQuarterSettlementMonth(month: number): boolean {
  return (QUARTER_SETTLEMENT_MONTHS as readonly number[]).includes(month);
}

export function invoiceStatus(job: Pick<AnniMgmtJob, "paid" | "invoice_sent" | "invoice_due_date">, todayIso: string): InvoiceStatus {
  if (job.paid) return "bezahlt";
  if (job.invoice_due_date && job.invoice_due_date < todayIso) return "überfällig";
  if (job.invoice_sent) return "versendet";
  return "offen";
}

export function isCommissionIncomeLine(line: Pick<AnniMgmtJobLine, "line_kind">): boolean {
  return line.line_kind === "income";
}

/** 20 %-Bemessung: Gage/GEMA/GVL/weitere. Keine Kundenreise, keine Extra-Spesen. */
export function commissionBaseCents(lines: Pick<AnniMgmtJobLine, "line_kind" | "amount_cents">[]): number {
  return lines.filter(isCommissionIncomeLine).reduce((sum, line) => sum + line.amount_cents, 0);
}

export function travelToClientCents(lines: Pick<AnniMgmtJobLine, "line_kind" | "amount_cents">[]): number {
  return lines
    .filter((l) => l.line_kind === "travel_to_client")
    .reduce((sum, line) => sum + line.amount_cents, 0);
}

export function extraClientSpesenCents(lines: Pick<AnniMgmtJobLine, "line_kind" | "amount_cents">[]): number {
  return lines
    .filter((l) => l.line_kind === "extra_client_spesen")
    .reduce((sum, line) => sum + line.amount_cents, 0);
}

export function paidJobsInMonth(jobs: AnniMgmtJob[], year: number, month: number): AnniMgmtJob[] {
  return jobs.filter((job) => {
    if (!job.paid || !job.paid_at) return false;
    const ym = yearMonthFromIsoDate(job.paid_at);
    return Boolean(ym && ym.year === year && ym.month === month);
  });
}

export function monthIncomeBaseCents(jobs: AnniMgmtJob[], year: number, month: number): number {
  return paidJobsInMonth(jobs, year, month).reduce(
    (sum, job) => sum + commissionBaseCents(job.lines),
    0,
  );
}

export function isUnreimbursedManagementTravel(line: AnniMgmtJobLine): boolean {
  return (
    line.line_kind === "expense_travel" &&
    line.traveler === "management" &&
    !line.reimbursed_at &&
    line.reimbursed_year == null &&
    line.reimbursed_month == null
  );
}

export function unreimbursedManagementTravelCents(jobs: AnniMgmtJob[]): number {
  let sum = 0;
  for (const job of jobs) {
    for (const line of job.lines) {
      if (isUnreimbursedManagementTravel(line)) sum += line.amount_cents;
    }
  }
  return sum;
}

export function unreimbursedManagementTravelLines(jobs: AnniMgmtJob[]): Array<AnniMgmtJobLine & { jobLabel: string; jobDate: string }> {
  const rows: Array<AnniMgmtJobLine & { jobLabel: string; jobDate: string }> = [];
  for (const job of jobs) {
    for (const line of job.lines) {
      if (isUnreimbursedManagementTravel(line)) {
        rows.push({ ...line, jobLabel: job.label, jobDate: job.performance_date });
      }
    }
  }
  return rows.sort((a, b) => a.jobDate.localeCompare(b.jobDate));
}

export type MonthSettlementPreview = {
  year: number;
  month: number;
  isQuarterMonth: boolean;
  paidIncomeBaseCents: number;
  feeCents: number;
  managementTravelCents: number;
  managementTravelLines: Array<AnniMgmtJobLine & { jobLabel: string; jobDate: string }>;
  totalInvoiceCents: number;
  paidJobs: AnniMgmtJob[];
};

export function monthSettlementPreview(
  jobs: AnniMgmtJob[],
  year: number,
  month: number,
): MonthSettlementPreview {
  const paid = paidJobsInMonth(jobs, year, month);
  const paidIncomeBaseCents = paid.reduce((sum, job) => sum + commissionBaseCents(job.lines), 0);
  const feeCents = commissionCents(paidIncomeBaseCents, COMMISSION_PERCENT);
  const isQuarterMonth = isQuarterSettlementMonth(month);
  const managementTravelLines = isQuarterMonth ? unreimbursedManagementTravelLines(jobs) : [];
  const managementTravelCents = managementTravelLines.reduce((sum, l) => sum + l.amount_cents, 0);
  return {
    year,
    month,
    isQuarterMonth,
    paidIncomeBaseCents,
    feeCents,
    managementTravelCents,
    managementTravelLines,
    totalInvoiceCents: feeCents + managementTravelCents,
    paidJobs: paid,
  };
}

function lineWho(line: AnniMgmtJobLine): string {
  if (line.traveler) return TRAVELER_LABELS[line.traveler];
  if (line.line_kind === "travel_to_client") return "Kunde (in Rechnung)";
  return "—";
}

function travelModeLabel(mode: TravelMode | null): string {
  if (!mode) return "Reise";
  return TRAVEL_MODE_LABELS[mode];
}

export function poolMovements(
  jobs: AnniMgmtJob[],
  payouts: AnniMgmtPoolPayout[],
): PoolMovement[] {
  const rows: PoolMovement[] = [];
  for (const job of jobs) {
    if (job.paid && job.paid_at) {
      for (const line of job.lines) {
        if (line.line_kind !== "travel_to_client") continue;
        rows.push({
          id: line.id,
          date: job.paid_at,
          direction: "in",
          amount_cents: line.amount_cents,
          who: lineWho(line),
          label: `${job.label} — verrechnete Reisekosten`,
          jobId: job.id,
          kind: "travel_to_client",
        });
      }
    }
    for (const line of job.lines) {
      if (line.line_kind !== "expense_travel") continue;
      rows.push({
        id: line.id,
        date: job.performance_date,
        direction: "out",
        amount_cents: line.amount_cents,
        who: lineWho(line),
        label: `${job.label} — ${travelModeLabel(line.travel_mode)}${line.route_description ? ` (${line.route_description})` : ""}`,
        jobId: job.id,
        kind: "expense_travel",
      });
    }
  }
  for (const payout of payouts) {
    rows.push({
      id: payout.id,
      date: payout.payout_date,
      direction: "out",
      amount_cents: payout.amount_cents,
      who: "Anni",
      label: payout.note?.trim() || "Ausschüttung an Anni",
      kind: "payout_anni",
    });
  }
  return rows.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export function poolSaldoCents(jobs: AnniMgmtJob[], payouts: AnniMgmtPoolPayout[]): number {
  let saldo = 0;
  for (const row of poolMovements(jobs, payouts)) {
    saldo += row.direction === "in" ? row.amount_cents : -row.amount_cents;
  }
  return saldo;
}

export type YearTotals = {
  year: number;
  paidIncomeCents: number;
  feeSollCents: number;
  feeBereitsCents: number;
  unpaidIncomeCents: number;
  overdueIncomeCents: number;
  poolInCents: number;
  poolOutTravelCents: number;
  poolPayoutAnniCents: number;
  poolSaldoCents: number;
};

export function yearTotals(
  jobs: AnniMgmtJob[],
  payouts: AnniMgmtPoolPayout[],
  settlements: AnniMgmtMonthSettlement[],
  year: number,
  todayIso: string,
): YearTotals {
  let paidIncomeCents = 0;
  let unpaidIncomeCents = 0;
  let overdueIncomeCents = 0;
  for (const job of jobs) {
    const base = commissionBaseCents(job.lines);
    if (job.paid && job.paid_at && yearMonthFromIsoDate(job.paid_at)?.year === year) {
      paidIncomeCents += base;
    } else if (!job.paid) {
      const dueYear = yearMonthFromIsoDate(job.invoice_due_date)?.year;
      const perfYear = yearMonthFromIsoDate(job.performance_date)?.year;
      if (dueYear === year || perfYear === year) {
        unpaidIncomeCents += base;
        if (invoiceStatus(job, todayIso) === "überfällig") overdueIncomeCents += base;
      }
    }
  }

  const movements = poolMovements(jobs, payouts).filter((m) => yearMonthFromIsoDate(m.date)?.year === year);
  const poolInCents = movements.filter((m) => m.kind === "travel_to_client").reduce((s, m) => s + m.amount_cents, 0);
  const poolOutTravelCents = movements
    .filter((m) => m.kind === "expense_travel")
    .reduce((s, m) => s + m.amount_cents, 0);
  const poolPayoutAnniCents = movements
    .filter((m) => m.kind === "payout_anni")
    .reduce((s, m) => s + m.amount_cents, 0);

  const feeBereitsCents = settlements
    .filter((s) => s.year === year)
    .reduce((sum, s) => sum + s.fee_cents, 0);

  return {
    year,
    paidIncomeCents,
    feeSollCents: commissionCents(paidIncomeCents, COMMISSION_PERCENT),
    feeBereitsCents,
    unpaidIncomeCents,
    overdueIncomeCents,
    poolInCents,
    poolOutTravelCents,
    poolPayoutAnniCents,
    poolSaldoCents: poolSaldoCents(jobs, payouts),
  };
}

export type IncomeRow = {
  job: AnniMgmtJob;
  status: InvoiceStatus;
  incomeCents: number;
  travelToClientCents: number;
  extraSpesenCents: number;
  feeCents: number;
  sortDate: string;
};

export function incomeOverviewRows(jobs: AnniMgmtJob[], todayIso: string): IncomeRow[] {
  return jobs
    .map((job) => {
      const incomeCents = commissionBaseCents(job.lines);
      return {
        job,
        status: invoiceStatus(job, todayIso),
        incomeCents,
        travelToClientCents: travelToClientCents(job.lines),
        extraSpesenCents: extraClientSpesenCents(job.lines),
        feeCents: job.paid ? commissionCents(incomeCents, COMMISSION_PERCENT) : 0,
        sortDate: job.paid && job.paid_at ? job.paid_at : job.performance_date,
      };
    })
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate) || b.job.label.localeCompare(a.job.label, "de"));
}

export const MONTH_NAMES_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function monthTitleDe(year: number, month: number): string {
  return `${MONTH_NAMES_DE[month - 1] ?? month} ${year}`;
}
