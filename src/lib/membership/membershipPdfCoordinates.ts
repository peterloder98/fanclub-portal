/**
 * Overlay positions for the official membership application template.
 * PDF coordinate system: origin bottom-left, A4 ≈ 595 × 842 pt.
 * Adjust values here when the template changes — run `node scripts/calibrate-membership-pdf.mjs` to preview.
 */

export const MEMBERSHIP_PDF_TEMPLATE_PATH =
  "public/documents/membership-application-template.pdf";

export type PdfTextFieldCoord = {
  x: number;
  y: number;
  maxWidth?: number;
  fontSize?: number;
};

export type PdfCheckboxCoord = {
  x: number;
  y: number;
  size?: number;
};

export type PdfSignatureCoord = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const membershipPdfCoordinates = {
  fontSize: 10.5,
  textColor: { r: 0.05, g: 0.05, b: 0.12 },

  page1: {
    membershipNumber: { x: 200, y: 673, fontSize: 10 } satisfies PdfTextFieldCoord,
    fullName: { x: 72, y: 602 } satisfies PdfTextFieldCoord,
    birthdate: { x: 72, y: 558 } satisfies PdfTextFieldCoord,
    street: { x: 72, y: 514 } satisfies PdfTextFieldCoord,
    postalCity: { x: 72, y: 470 } satisfies PdfTextFieldCoord,
    email: { x: 72, y: 426 } satisfies PdfTextFieldCoord,
    mobile: { x: 72, y: 382 } satisfies PdfTextFieldCoord,
    instagram: { x: 72, y: 338 } satisfies PdfTextFieldCoord,
    facebook: { x: 72, y: 294 } satisfies PdfTextFieldCoord,
  },

  page2: {
    membershipStart: { x: 295, y: 688 } satisfies PdfTextFieldCoord,
    privacyCheckbox: { x: 72, y: 490, size: 10 } satisfies PdfCheckboxCoord,
    whatsappCheckbox: { x: 72, y: 378, size: 10 } satisfies PdfCheckboxCoord,
    whatsappMobile: { x: 165, y: 348 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 72, y: 172, maxWidth: 160 } satisfies PdfTextFieldCoord,
    signature: { x: 250, y: 128, width: 180, height: 44 } satisfies PdfSignatureCoord,
  },
} as const;
