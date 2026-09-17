import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatNetEur } from "@/lib/anni-management/money";
import {
  monthSettlementPreview,
  monthTitleDe,
} from "@/lib/anni-management/calc";
import { QUARTER_RULE_COPY, type AnniMgmtJob } from "@/lib/anni-management/types";
import { TRAVEL_MODE_LABELS } from "@/lib/anni-management/types";

function formatIsoDateDe(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function pdfSafe(text: string): string {
  return text
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("−", "-")
    .replaceAll("€", "EUR")
    .replaceAll("„", '"')
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("‚", "'")
    .replaceAll("’", "'");
}
function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildMonthlySettlementPdf(input: {
  jobs: AnniMgmtJob[];
  year: number;
  month: number;
  generatedByName: string;
}): Promise<Uint8Array> {
  const preview = monthSettlementPreview(input.jobs, input.year, input.month);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  const maxWidth = pageWidth - margin * 2;
  const navy = rgb(0.07, 0.16, 0.32);
  const muted = rgb(0.35, 0.4, 0.48);
  const lineColor = rgb(0.85, 0.88, 0.92);

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  function text(value: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const size = opts.size ?? 10;
    const used = opts.bold ? fontBold : font;
    const lines = wrap(pdfSafe(value), used, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font: used,
        color: opts.color ?? navy,
      });
      y -= size + 3;
    }
    y -= opts.gap ?? 2;
  }

  function rule() {
    ensureSpace(12);
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.6,
      color: lineColor,
    });
    y -= 10;
  }

  text("Abrechnung Anni & Management", { size: 16, bold: true, gap: 4 });
  text(monthTitleDe(input.year, input.month), { size: 12, bold: true, gap: 6 });
  text("Vertraulich — nur Anni und Management. Alle Beträge netto.", { size: 9, color: muted });
  text(`Erstellt am ${formatIsoDateDe(new Date().toISOString())} von ${input.generatedByName}.`, {
    size: 9,
    color: muted,
    gap: 8,
  });
  rule();

  text("1. Einnahmen (Bemessung 20 %)", { size: 12, bold: true, gap: 4 });
  text(
    "Gezählt werden bezahlte Jobs nach Zahlungsdatum. Reisekosten an den Kunden und zusätzliche Kundenspesen gehören nicht zur 20 %-Basis.",
    { size: 9, color: muted, gap: 6 },
  );

  if (!preview.paidJobs.length) {
    text("Keine bezahlten Einnahmen in diesem Monat.", { size: 10, gap: 8 });
  } else {
    for (const job of preview.paidJobs) {
      const income = job.lines
        .filter((l) => l.line_kind === "income")
        .map((l) => `${l.income_type || "Einnahme"} ${formatNetEur(l.amount_cents)}`)
        .join(" · ");
      text(`${formatIsoDateDe(job.paid_at)} — ${job.label}`, { size: 10, bold: true });
      text(`Auftritt ${formatIsoDateDe(job.performance_date)}${income ? ` · ${income}` : ""}`, {
        size: 9,
        color: muted,
        gap: 4,
      });
    }
  }

  text(`Bemessungsgrundlage: ${formatNetEur(preview.paidIncomeBaseCents)}`, { size: 10 });
  text(`Management-Honorar 20 %: ${formatNetEur(preview.feeCents)}`, { size: 11, bold: true, gap: 10 });
  rule();

  text("2. Management-Reisekosten (Quartal)", { size: 12, bold: true, gap: 4 });
  text(QUARTER_RULE_COPY, { size: 9, color: muted, gap: 6 });

  if (!preview.isQuarterMonth) {
    text("Dieser Monat ist kein Quartalsmonat — Reisekosten des Managements stehen nicht auf dieser Rechnung.", {
      size: 10,
      gap: 8,
    });
  } else if (!preview.managementTravelLines.length) {
    text("Keine offenen Management-Reisekosten.", { size: 10, gap: 8 });
  } else {
    for (const line of preview.managementTravelLines) {
      const mode = line.travel_mode ? TRAVEL_MODE_LABELS[line.travel_mode] : "Reise";
      const km = line.travel_mode === "auto" && line.km ? ` · ${line.km} km` : "";
      text(
        `${formatIsoDateDe(line.jobDate)} — ${line.jobLabel}: ${mode}${km} ${formatNetEur(line.amount_cents)}`,
        { size: 10, gap: 2 },
      );
      if (line.route_description) {
        text(line.route_description, { size: 9, color: muted, gap: 4 });
      }
    }
    text(`Offene Management-Reise: ${formatNetEur(preview.managementTravelCents)}`, {
      size: 11,
      bold: true,
      gap: 10,
    });
  }
  rule();

  text("3. Rechnung Management an Anni", { size: 12, bold: true, gap: 6 });
  text(`20 % Honorar: ${formatNetEur(preview.feeCents)}`, { size: 10 });
  text(
    `Reisekosten Management: ${preview.isQuarterMonth ? formatNetEur(preview.managementTravelCents) : "nicht fällig"}`,
    { size: 10 },
  );
  text(`Gesamt netto: ${formatNetEur(preview.totalInvoiceCents)}`, { size: 14, bold: true, gap: 10 });
  text(
    "Bitte auf dieser Grundlage die Rechnung an Anni schreiben. Offene Management-Reisekosten nach Zahlung in der App als ausgeglichen markieren, damit sie nicht doppelt erscheinen.",
    { size: 9, color: muted, gap: 8 },
  );

  return doc.save();
}

export function settlementPdfFilename(year: number, month: number): string {
  return `abrechnung-anni-management-${year}-${String(month).padStart(2, "0")}.pdf`;
}
