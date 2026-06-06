/**
 * Overlay positions for the official membership application template.
 * PDF coordinate system: origin bottom-left, A4 ≈ 595 × 842 pt.
 * Calibrated against public/documents/membership-application-template.pdf (Stand 22.03.2026).
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
    fullName: { x: 72, y: 604 } satisfies PdfTextFieldCoord,
    birthdate: { x: 72, y: 560 } satisfies PdfTextFieldCoord,
    street: { x: 72, y: 516 } satisfies PdfTextFieldCoord,
    postalCity: { x: 72, y: 472 } satisfies PdfTextFieldCoord,
    email: { x: 72, y: 428 } satisfies PdfTextFieldCoord,
    mobile: { x: 72, y: 384 } satisfies PdfTextFieldCoord,
    instagram: { x: 72, y: 340 } satisfies PdfTextFieldCoord,
    facebook: { x: 72, y: 296 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 72, y: 252, maxWidth: 210 } satisfies PdfTextFieldCoord,
    signature: { x: 300, y: 218, width: 200, height: 34 } satisfies PdfSignatureCoord,
  },

  page2: {
    membershipStart: { x: 310, y: 728 } satisfies PdfTextFieldCoord,
    privacyCheckbox: { x: 72, y: 448, size: 10 } satisfies PdfCheckboxCoord,
    whatsappCheckbox: { x: 72, y: 332, size: 10 } satisfies PdfCheckboxCoord,
    whatsappMobile: { x: 165, y: 272 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 200, y: 116, maxWidth: 220 } satisfies PdfTextFieldCoord,
    signature: { x: 320, y: 98, width: 200, height: 36 } satisfies PdfSignatureCoord,
  },
} as const;
