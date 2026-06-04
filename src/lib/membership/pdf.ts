import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export type MembershipApplicationPdfData = {
  id: string;
  membership_number?: string | null;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender?: string | null;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  mobile_dial_code?: string | null;
  mobile_number?: string | null;
  email: string;
  membership_start_date?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  bic?: string | null;
  whatsapp_opt_in?: boolean;
  whatsapp_dial_code?: string | null;
  whatsapp_number?: string | null;
  fee_cents?: number;
  signed_at_place: string;
  signed_at_date: string;
  created_at?: string;
};

function formatDE(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split("-");
      return `${day}.${m}.${y}`;
    }
    return dateStr;
  }
  return d.toLocaleDateString("de-DE");
}

function line(label: string, value: string) {
  return `${label}: ${value || "—"}`;
}

export async function buildMembershipApplicationPdf(
  data: MembershipApplicationPdfData,
  signaturePng?: Uint8Array | null,
) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595.28, 841.89]);
  const margin = 50;
  let y = 800;

  const draw = (text: string, bold = false, size = 11) => {
    if (y < 80) {
      page = doc.addPage([595.28, 841.89]);
      y = 800;
    }
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 90) chunks.push(text.slice(i, i + 90));
    for (const chunk of chunks) {
      if (y < 80) {
        page = doc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawText(chunk, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= size + 8;
    }
  };

  draw("Mitgliedsantrag – Anni-Perka-Fanclub e. V.", true, 16);
  draw(`Antrags-ID: ${data.id}`, false, 9);
  y -= 8;
  draw(
    line(
      "Mitgliedsnummer",
      data.membership_number?.trim() || "Wird nach Freigabe vergeben",
    ),
  );
  draw(line("Name", `${data.first_name} ${data.last_name}`));
  draw(line("Geburtsdatum", formatDE(data.birthdate)));
  if (data.gender) draw(line("Geschlecht", data.gender));
  draw(line("Straße", data.street));
  draw(line("PLZ / Ort", `${data.postal_code} ${data.city}`));
  draw(line("Land", data.country));
  draw(line("E-Mail", data.email));
  draw(line("Telefon", data.phone));
  if (data.mobile_number) {
    draw(line("Handy", `${data.mobile_dial_code ?? ""}${data.mobile_number}`));
  }
  draw(
    line(
      "WhatsApp-Gruppe",
      data.whatsapp_opt_in
        ? `Ja (${data.whatsapp_dial_code ?? ""}${data.whatsapp_number ?? ""})`
        : "Nein",
    ),
  );
  draw(line("Jahresbeitrag", `${((data.fee_cents ?? 1500) / 100).toFixed(2)} EUR`));
  if (data.membership_start_date) {
    draw(line("Gewünschter Beginn", formatDE(data.membership_start_date)));
  }
  if (data.account_holder || data.iban) {
    draw(line("Kontoinhaber", data.account_holder ?? "—"));
    draw(line("IBAN", data.iban ?? "—"));
    if (data.bic) draw(line("BIC", data.bic));
  }
  y -= 6;
  draw(
    "Ich beantrage die Mitgliedschaft und bestätige, die Satzung (Anlage) gelesen und akzeptiert zu haben.",
  );
  draw(`Ort / Datum der Unterzeichnung: ${data.signed_at_place}, ${formatDE(data.signed_at_date)}`);
  y -= 10;
  draw("Unterschrift Antragsteller/in:", true);

  if (signaturePng?.length) {
    try {
      const img = await doc.embedPng(signaturePng);
      const w = 180;
      const h = (img.height / img.width) * w;
      if (y - h < 60) {
        page = doc.addPage([595.28, 841.89]);
        y = 760;
      }
      page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
      y -= h + 20;
    } catch {
      draw("(Signaturbild konnte nicht eingebettet werden)");
    }
  }

  return doc.save();
}

export async function mergeWithSatzung(applicationPdfBytes: Uint8Array) {
  const merged = await PDFDocument.create();
  const appDoc = await PDFDocument.load(applicationPdfBytes);
  const appPages = await merged.copyPages(appDoc, appDoc.getPageIndices());
  appPages.forEach((p) => merged.addPage(p));

  try {
    const satzungPath = path.join(process.cwd(), "public/documents/satzung.pdf");
    const satzungBytes = await readFile(satzungPath);
    const satzungDoc = await PDFDocument.load(satzungBytes);
    const satzungPages = await merged.copyPages(satzungDoc, satzungDoc.getPageIndices());
    satzungPages.forEach((p) => merged.addPage(p));
  } catch (e) {
    console.warn("[pdf] Satzung konnte nicht angehängt werden:", e);
  }

  return merged.save();
}

export async function buildFullMembershipPdf(
  data: MembershipApplicationPdfData,
  signaturePng?: Uint8Array | null,
) {
  const applicationPdf = await buildMembershipApplicationPdf(data, signaturePng);
  return mergeWithSatzung(applicationPdf);
}
