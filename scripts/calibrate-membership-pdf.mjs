import { readFile, writeFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { membershipPdfCoordinates as c } from "../src/lib/membership/membershipPdfCoordinates";

const templatePath = path.join(
  process.cwd(),
  "public/documents/membership-application-template.pdf",
);

/** Visual calibration — run: npx tsx scripts/calibrate-membership-pdf.mjs */
async function main() {
  const bytes = await readFile(templatePath);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();

  const p1 = [
    { text: "1234", ...c.page1.membershipNumber },
    { text: "Max Mustermann", ...c.page1.fullName },
    { text: "01.01.1990", ...c.page1.birthdate },
    { text: "Musterstraße 1", ...c.page1.street },
    { text: "12345 Berlin", ...c.page1.postalCity },
    { text: "max@example.de", ...c.page1.email },
    { text: "+49 170 1234567", ...c.page1.mobile },
    { text: "@max", ...c.page1.instagram },
    { text: "Max Mustermann", ...c.page1.facebook },
    { text: "Berlin, 05.06.2026", ...c.page1.signedPlaceDate },
    { sig: true, ...c.page1.signature },
  ];
  const p2 = [
    { text: "01.06.2026", ...c.page2.membershipStart },
    { text: "X", ...c.page2.privacyCheckbox },
    { text: "X", ...c.page2.whatsappCheckbox },
    { text: "+49 170 1234567", ...c.page2.whatsappMobile },
    { text: "Berlin, 05.06.2026", ...c.page2.signedPlaceDate },
    { sig: true, ...c.page2.signature },
  ];

  for (const f of p1) {
    if ("sig" in f && f.sig) {
      pages[0].drawRectangle({
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        borderColor: rgb(0.8, 0, 0),
        borderWidth: 1,
      });
    } else if (f.text) {
      pages[0].drawText(f.text, {
        x: f.x,
        y: f.y,
        size: f.fontSize ?? 10.5,
        font,
        color: rgb(0.1, 0.2, 0.6),
      });
    }
  }
  for (const f of p2) {
    if ("sig" in f && f.sig) {
      pages[1].drawRectangle({
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        borderColor: rgb(0.8, 0, 0),
        borderWidth: 1,
      });
    } else if (f.text) {
      pages[1].drawText(f.text, {
        x: f.x,
        y: f.y,
        size: f.fontSize ?? 10.5,
        font,
        color: rgb(0.1, 0.2, 0.6),
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
