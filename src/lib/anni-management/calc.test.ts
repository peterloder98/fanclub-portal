import { describe, expect, it } from "vitest";
import { autoKmNetCents, commissionCents, parseEurToCents } from "@/lib/anni-management/money";
import {
  commissionBaseCents,
  invoiceStatus,
  isQuarterSettlementMonth,
  monthSettlementPreview,
  poolSaldoCents,
  yearTotals,
} from "@/lib/anni-management/calc";
import type { AnniMgmtJob, AnniMgmtJobLine } from "@/lib/anni-management/types";

function line(partial: Partial<AnniMgmtJobLine> & Pick<AnniMgmtJobLine, "line_kind" | "amount_cents">): AnniMgmtJobLine {
  return {
    id: partial.id ?? crypto.randomUUID(),
    job_id: partial.job_id ?? "job",
    income_type: partial.income_type ?? null,
    traveler: partial.traveler ?? null,
    travel_mode: partial.travel_mode ?? null,
    km: partial.km ?? null,
    route_description: partial.route_description ?? null,
    reimbursed_at: partial.reimbursed_at ?? null,
    reimbursed_year: partial.reimbursed_year ?? null,
    reimbursed_month: partial.reimbursed_month ?? null,
    note: partial.note ?? null,
    created_at: partial.created_at ?? "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

function job(partial: Partial<AnniMgmtJob> & Pick<AnniMgmtJob, "id" | "lines">): AnniMgmtJob {
  return {
    performance_date: "2026-03-10",
    label: "Club Konzert",
    description: null,
    invoice_due_date: "2026-03-20",
    invoice_sent: false,
    invoice_sent_at: null,
    paid: false,
    paid_at: null,
    invoice_pdf_path: null,
    created_by: null,
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
    ...partial,
  };
}

describe("20 %-Bemessung", () => {
  it("nimmt Gage/GEMA/GVL, nicht Kundenreise und nicht Extra-Spesen", () => {
    const base = commissionBaseCents([
      line({ line_kind: "income", income_type: "Gage", amount_cents: 100_000 }),
      line({ line_kind: "income", income_type: "GEMA", amount_cents: 20_000 }),
      line({ line_kind: "income", income_type: "GVL", amount_cents: 10_000 }),
      line({ line_kind: "travel_to_client", amount_cents: 50_000 }),
      line({ line_kind: "extra_client_spesen", amount_cents: 8_000 }),
      line({ line_kind: "expense_travel", amount_cents: 12_000, traveler: "anni" }),
    ]);
    expect(base).toBe(130_000);
    expect(commissionCents(base)).toBe(26_000);
  });
});

describe("Fälligkeit", () => {
  it("ist überfällig wenn Fälligkeit vorbei und nicht bezahlt", () => {
    const unpaid = job({
      id: "1",
      invoice_due_date: "2026-03-01",
      paid: false,
      lines: [],
    });
    expect(invoiceStatus(unpaid, "2026-03-02")).toBe("überfällig");
    expect(invoiceStatus({ ...unpaid, invoice_sent: true }, "2026-02-28")).toBe("versendet");
    expect(invoiceStatus({ ...unpaid, paid: true, paid_at: "2026-03-05" }, "2026-03-10")).toBe(
      "bezahlt",
    );
    expect(invoiceStatus({ ...unpaid, invoice_due_date: "2026-03-10" }, "2026-03-10")).toBe("offen");
  });
});

describe("Kilometer", () => {
  it("rechnet 0,33 €/km, nicht 0,33 Cent", () => {
    expect(autoKmNetCents(1)).toBe(33);
    expect(autoKmNetCents(10)).toBe(330);
    expect(autoKmNetCents(100)).toBe(3_300);
    expect(parseEurToCents("0,33")).toBe(33);
  });
});

describe("Reisekostenpool", () => {
  it("bildet ein fortlaufendes Saldo aus Kundenreise minus Ausgaben minus Ausschüttung", () => {
    const jobs: AnniMgmtJob[] = [
      job({
        id: "paid",
        paid: true,
        paid_at: "2026-04-02",
        lines: [
          line({ line_kind: "income", amount_cents: 80_000 }),
          line({ line_kind: "travel_to_client", amount_cents: 50_000 }),
          line({
            line_kind: "expense_travel",
            amount_cents: 12_000,
            traveler: "anni",
            travel_mode: "bahn",
          }),
        ],
      }),
      job({
        id: "unpaid",
        paid: false,
        lines: [line({ line_kind: "travel_to_client", amount_cents: 50_000 })],
      }),
    ];
    const saldo = poolSaldoCents(jobs, [
      {
        id: "p1",
        payout_date: "2026-12-01",
        amount_cents: 10_000,
        note: "Ausschüttung an Anni",
        created_by: null,
        created_at: "2026-12-01T00:00:00.000Z",
      },
    ]);
    // 500 in (paid only) - 120 travel - 100 payout
    expect(saldo).toBe(28_000);
  });
});

describe("Quartals-Reise Management", () => {
  it("hängt offene Management-Reise nur im Quartalsmonat an und nur einmal", () => {
    expect(isQuarterSettlementMonth(3)).toBe(true);
    expect(isQuarterSettlementMonth(4)).toBe(false);

    const openTravel = line({
      id: "t1",
      line_kind: "expense_travel",
      amount_cents: 7_000,
      traveler: "management",
      travel_mode: "hotel",
    });
    const jobs: AnniMgmtJob[] = [
      job({
        id: "j1",
        paid: true,
        paid_at: "2026-03-15",
        lines: [
          line({ line_kind: "income", amount_cents: 100_000 }),
          openTravel,
        ],
      }),
    ];

    const march = monthSettlementPreview(jobs, 2026, 3);
    expect(march.paidIncomeBaseCents).toBe(100_000);
    expect(march.feeCents).toBe(20_000);
    expect(march.managementTravelCents).toBe(7_000);
    expect(march.totalInvoiceCents).toBe(27_000);

    const april = monthSettlementPreview(jobs, 2026, 4);
    expect(april.feeCents).toBe(0);
    expect(april.managementTravelCents).toBe(0);

    const settledJobs: AnniMgmtJob[] = [
      {
        ...jobs[0]!,
        lines: [
          jobs[0]!.lines[0]!,
          { ...openTravel, reimbursed_at: "2026-03-31T00:00:00.000Z", reimbursed_year: 2026, reimbursed_month: 3 },
        ],
      },
    ];
    const marchAgain = monthSettlementPreview(settledJobs, 2026, 6);
    expect(marchAgain.managementTravelCents).toBe(0);
  });
});

describe("Jahr", () => {
  it("zählt 20 % Soll aus bezahlten Einnahmen und Pool über Jahresgrenzen weiter", () => {
    const jobs: AnniMgmtJob[] = [
      job({
        id: "y1",
        paid: true,
        paid_at: "2025-12-20",
        performance_date: "2025-12-01",
        lines: [line({ line_kind: "travel_to_client", amount_cents: 50_000 })],
      }),
      job({
        id: "y2",
        paid: true,
        paid_at: "2026-01-10",
        lines: [line({ line_kind: "income", amount_cents: 200_000 })],
      }),
    ];
    const y2026 = yearTotals(jobs, [], [], 2026, "2026-06-01");
    expect(y2026.paidIncomeCents).toBe(200_000);
    expect(y2026.feeSollCents).toBe(40_000);
    expect(y2026.poolSaldoCents).toBe(50_000);
  });
});
