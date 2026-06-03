import { loadDefaultMailSignature } from "@/lib/email/default-mail-signature";

export type AdminSignatureMail = {
  text: string;
  htmlBlock: string;
  imageCid: string | null;
  imageBuffer: Buffer | null;
  contentType: string;
};

/** Standard-Signatur aus Admin-Einstellungen (oder Fanclub allgemein). */
export async function loadAdminSignatureForMail(): Promise<AdminSignatureMail> {
  return loadDefaultMailSignature();
}
