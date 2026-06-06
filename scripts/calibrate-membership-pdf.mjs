import { readFile, writeFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const templatePath = path.join(
  process.cwd(),
  "public/documents/membership-application-template.pdf",
);

/** Quick visual calibration — run: node scripts/calibrate-membership-pdf.mjs */
/** Keep in sync with src/lib/membership/membershipPdfCoordinates.ts */
const fields = {
  page1: [
    { key: "fullName", x: 72, y: 604, text: "Max Mustermann" },
    { key: "birthdate", x: 72, y: 560, text: "01.01.1990" },
    { key: "street", x: 72, y: 516, text: "Musterstraße 1" },
    { key: "postalCity", x: 72, y: 472, text: "12345 Berlin" },
    { key: "email", x: 72, y: 428, text: "max@example.de" },
    { key: "mobile", x: 72, y: 384, text: "+49 170 1234567" },
    { key: "instagram", x: 72, y: 340, text: "@max" },
    { key: "facebook", x: 72, y: 296, text: "Max Mustermann" },
    { key: "signedPlaceDate", x: 72, y: 252, text: "Berlin, 05.06.2026" },
    { key: "signature", x: 300, y: 218, w: 200, h: 34 },
  ],
  page2: [
    { key: "membershipStart", x: 310, y: 728, text: "01.06.2026" },
    { key: "privacyCheck", x: 72, y: 448, text: "X" },
    { key: "whatsappCheck", x: 72, y: 332, text: "X" },
    { key: "whatsappMobile", x: 165, y: 272, text: "+49 170 1234567" },
    { key: "signedPlaceDate", x: 200, y: 116, text: "Berlin, 05.06.2026" },
    { key: "signature", x: 320, y: 98, w: 200, h: 36 },
  ],
};

async function main() {
  const bytes = await readFile(templatePath);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  for (const f of fields.page1) {
    if (f.text) {
      pages[0].drawText(f.text, { x: f.x, y: f.y, size: 11, font, color: rgb(0.1, 0.2, 0.6) });
    } else {
      pages[0].drawRectangle({
        x: f.x,
        y: f.y,
        width: f.w,
        height: f.h,
        borderColor: rgb(0.8, 0, 0),
        borderWidth: 1,
      });
    }
  }
  for (const f of fields.page2) {
    if (f.text) {
      pages[1].drawText(f.text, { x: f.x, y: f.y, size: 11, font, color: rgb(0.1, 0.2, 0.6) });
    } else {
      pages[1].drawRectangle({
        x: f.x,
        y: f.y,
        width: f.w,
        height: f.h,
        borderColor: rgb(0.8, 0, 0),
        borderWidth: 1,
      });
    }
  }

  const out = path.join(process.cwd(), "tmp-membership-calibration.pdf");
  await writeFile(out, await doc.save());
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
