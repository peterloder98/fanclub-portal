import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import {
  MEMBERSHIP_PDF_TEMPLATE_PATH,
  membershipPdfCoordinates,
} from "@/lib/membership/membershipPdfCoordinates";

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
  whatsapp_opt_in?: boolean;
  whatsapp_dial_code?: string | null;
  whatsapp_number?: string | null;
  privacy_accepted?: boolean;
  signed_at_place: string;
  signed_at_date: string;
  instagram?: string | null;
  facebook?: string | null;
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

function formatMobile(data: MembershipApplicationPdfData) {
  if (data.mobile_number?.trim()) {
    return `${data.mobile_dial_code ?? ""}${data.mobile_number}`.trim();
  }
  return data.phone?.trim() ?? "";
}

function formatWhatsappMobile(data: MembershipApplicationPdfData) {
  if (!data.whatsapp_opt_in) return "";
  return `${data.whatsapp_dial_code ?? ""}${data.whatsapp_number ?? ""}`.trim();
}

function drawFieldText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  coord: { x: number; y: number; maxWidth?: number; fontSize?: number },
) {
  const value = text.trim();
  if (!value) return;

  const size = coord.fontSize ?? membershipPdfCoordinates.fontSize;
  const color = membershipPdfCoordinates.textColor;
  let drawText = value;

  if (coord.maxWidth) {
    while (drawText.length > 1 && font.widthOfTextAtSize(drawText, size) > coord.maxWidth) {
      drawText = drawText.slice(0, -1);
    }
  }

  page.drawText(drawText, {
    x: coord.x,
    y: coord.y,
    size,
    font,
    color: rgb(color.r, color.g, color.b),
  });
}

function drawCheckbox(page: PDFPage, font: PDFFont, checked: boolean, coord: { x: number; y: number; size?: number }) {
  if (!checked) return;
  const size = coord.size ?? 11;
  page.drawText("X", {
    x: coord.x + 1,
    y: coord.y - 1,
    size,
    font,
    color: rgb(0.05, 0.05, 0.12),
  });
}

async function loadTemplateBytes() {
  const templatePath = path.join(process.cwd(), MEMBERSHIP_PDF_TEMPLATE_PATH);
  return readFile(templatePath);
}

/**
 * Fills the official 4-page membership template (pages 3–4 = Satzung unchanged).
 */
export async function generateMembershipPdf(
  applicationData: MembershipApplicationPdfData,
  signaturePng?: Uint8Array | null,
) {
  const templateBytes = await loadTemplateBytes();
  const doc = await PDFDocument.load(templateBytes);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const pages = doc.getPages();

  if (pages.length < 4) {
    throw new Error("Mitgliedsantrag-Vorlage muss 4 Seiten haben (Formular + Satzung).");
  }

  const page1 = pages[0];
  const page2 = pages[1];
  const coords = membershipPdfCoordinates;

  const membershipNumber =
    applicationData.membership_number?.trim() || "wird vergeben";

  drawFieldText(page1, font, membershipNumber, coords.page1.membershipNumber);
  drawFieldText(
    page1,
    font,
    `${applicationData.first_name} ${applicationData.last_name}`.trim(),
    coords.page1.fullName,
  );
  drawFieldText(page1, font, formatDE(applicationData.birthdate), coords.page1.birthdate);
  drawFieldText(page1, font, applicationData.street, coords.page1.street);
  drawFieldText(
    page1,
    font,
    `${applicationData.postal_code} ${applicationData.city}`.trim(),
    coords.page1.postalCity,
  );
  drawFieldText(page1, font, applicationData.email, coords.page1.email);
  drawFieldText(page1, font, formatMobile(applicationData), coords.page1.mobile);

  if (applicationData.instagram?.trim()) {
    drawFieldText(page1, font, applicationData.instagram, coords.page1.instagram);
  }
  if (applicationData.facebook?.trim()) {
    drawFieldText(page1, font, applicationData.facebook, coords.page1.facebook);
  }

  const startDate = applicationData.membership_start_date
    ? formatDE(applicationData.membership_start_date)
    : formatDE(applicationData.signed_at_date);
  drawFieldText(page2, font, startDate, coords.page2.membershipStart);

  drawCheckbox(page2, font, applicationData.privacy_accepted !== false, coords.page2.privacyCheckbox);
  drawCheckbox(page2, font, Boolean(applicationData.whatsapp_opt_in), coords.page2.whatsappCheckbox);

  if (applicationData.whatsapp_opt_in) {
    drawFieldText(page2, font, formatWhatsappMobile(applicationData), coords.page2.whatsappMobile);
  }

  const signedLine = `${applicationData.signed_at_place}, ${formatDE(applicationData.signed_at_date)}`;
  drawFieldText(page2, font, signedLine, coords.page2.signedPlaceDate);

  if (signaturePng?.length) {
    try {
      const img = await doc.embedPng(signaturePng);
      const box = coords.page2.signature;
      const scale = Math.min(box.width / img.width, box.height / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      page2.drawImage(img, {
        x: box.x + (box.width - width) / 2,
        y: box.y + (box.height - height) / 2,
        width,
        height,
      });
    } catch (e) {
      console.warn("[pdf] Signatur konnte nicht eingebettet werden:", e);
    }
  }

  return doc.save();
}
