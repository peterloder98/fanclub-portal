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
    fullName: { x: 72, y: 593 } satisfies PdfTextFieldCoord,
    birthdate: { x: 72, y: 549 } satisfies PdfTextFieldCoord,
    street: { x: 72, y: 505 } satisfies PdfTextFieldCoord,
    postalCity: { x: 72, y: 461 } satisfies PdfTextFieldCoord,
    email: { x: 72, y: 417 } satisfies PdfTextFieldCoord,
    mobile: { x: 72, y: 369 } satisfies PdfTextFieldCoord,
    instagram: { x: 72, y: 323 } satisfies PdfTextFieldCoord,
    facebook: { x: 72, y: 276 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 72, y: 228, maxWidth: 180 } satisfies PdfTextFieldCoord,
    signature: { x: 200, y: 220, width: 320, height: 26 } satisfies PdfSignatureCoord,
  },

  page2: {
    membershipStart: { x: 310, y: 726 } satisfies PdfTextFieldCoord,
    privacyCheckbox: { x: 72, y: 445, size: 10 } satisfies PdfCheckboxCoord,
    whatsappCheckbox: { x: 72, y: 270, size: 10 } satisfies PdfCheckboxCoord,
    whatsappMobile: { x: 175, y: 262 } satisfies PdfTextFieldCoord,
    signedPlaceDate: { x: 200, y: 126, maxWidth: 200 } satisfies PdfTextFieldCoord,
    signature: { x: 200, y: 118, width: 340, height: 24 } satisfies PdfSignatureCoord,
  },
} as const;
