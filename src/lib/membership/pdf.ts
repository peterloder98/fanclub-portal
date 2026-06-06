export type { MembershipApplicationPdfData } from "@/lib/membership/generate-membership-pdf";
export { generateMembershipPdf } from "@/lib/membership/generate-membership-pdf";

/** @deprecated Use generateMembershipPdf — kept for existing imports. */
export async function buildFullMembershipPdf(
  data: import("@/lib/membership/generate-membership-pdf").MembershipApplicationPdfData,
  signaturePng?: Uint8Array | null,
) {
  const { generateMembershipPdf } = await import("@/lib/membership/generate-membership-pdf");
  return generateMembershipPdf(data, signaturePng);
}
