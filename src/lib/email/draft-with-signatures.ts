import { getDefaultMailSignatureId } from "@/lib/email/default-mail-signature";
import { buildSignatureTextMap } from "@/lib/email/signature-body";
import { listMailSignatureOptions, loadMailSignature } from "@/lib/email/signatures";

export async function loadSignaturePickerData() {
  const signatures = await listMailSignatureOptions();
  const defaultSignatureId = await getDefaultMailSignatureId();
  const signatureTexts = await buildSignatureTextMap(signatures, async (id) => {
    const sig = await loadMailSignature(id);
    return sig.text;
  });
  return { signatures, defaultSignatureId, signatureTexts };
}
