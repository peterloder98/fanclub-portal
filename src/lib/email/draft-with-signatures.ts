import { buildSignatureTextMap } from "@/lib/email/signature-body";
import { CLUB_SIGNATURE_ID, listMailSignatureOptions, loadMailSignature } from "@/lib/email/signatures";

export async function loadSignaturePickerData() {
  const signatures = await listMailSignatureOptions();
  const defaultSignatureId = CLUB_SIGNATURE_ID;
  const signatureTexts = await buildSignatureTextMap(signatures, async (id) => {
    const sig = await loadMailSignature(id);
    return sig.text;
  });
  return { signatures, defaultSignatureId, signatureTexts };
}
