/**
 * Overlay positions for the official membership application template.
 * PDF coordinate system: origin bottom-left, A4 ≈ 595 × 842 pt.
 * Template: public/documents/membership-application-template.pdf
 * Calibrated via template raster analysis (Stand 22.03.2026).
 * Preview: npx tsx scripts/render-test-membership-pdf.ts
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

  /**
   * Kalibriert an Unterlinien der Vorlage (Stand 22.03.2026).
   * Text-Baseline liegt ca. 5 pt über der Linie; PDF-Ursprung unten links.
   */
  page1: {
    membershipNumber: { x: 168, y: 666, fontSize: 10.5 } satisfies PdfTextFieldCoord,
    fullName: { x: 72, y: 600 } satisfies PdfTextFieldCoord,
    birthdate: { x: 72, y: 556 } satisfies PdfTextFieldCoord,
    street: { x: 72, y: 512 } satisfies PdfTextFieldCoord,
    postalCity: { x: 72, y: 468 } satisfies PdfTextFieldCoord,
    email: { x: 72, y: 424 } satisfies PdfTextFieldCoord,
    mobile: { x: 72, y: 376 } satisfies PdfTextFieldCoord,
    instagram: { x: 72, y: 329 } satisfies PdfTextFieldCoord,
    facebook: { x: 72, y: 282 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 72, y: 236, maxWidth: 160 } satisfies PdfTextFieldCoord,
    signature: { x: 200, y: 218, width: 160, height: 28 } satisfies PdfSignatureCoord,
  },

  page2: {
    membershipStart: { x: 248, y: 737 } satisfies PdfTextFieldCoord,
    /** Veraltete Kontodaten im Template überdecken (nur Abschnitt 3). */
    bankDetailsOverlay: { x: 55, y: 582, width: 478, height: 82 },
    bankDetailsLines: { x: 72, y: 652, lineHeight: 13, fontSize: 10.5 },
    privacyCheckbox: { x: 72, y: 447, size: 9 } satisfies PdfCheckboxCoord,
    whatsappCheckbox: { x: 72, y: 278, size: 9 } satisfies PdfCheckboxCoord,
    whatsappMobile: { x: 286, y: 262 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 215, y: 131, maxWidth: 100 } satisfies PdfTextFieldCoord,
    signature: { x: 310, y: 118, width: 100, height: 28 } satisfies PdfSignatureCoord,
  },
} as const;
