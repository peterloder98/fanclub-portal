/** Kontaktanzeige für Admin (Antrag / Mitglied). */

export function formatMemberMobile(input: {
  phone?: string | null;
  mobile_dial_code?: string | null;
  mobile_number?: string | null;
}): string {
  if (input.mobile_number?.trim()) {
    return `${input.mobile_dial_code ?? ""}${input.mobile_number}`.trim();
  }
  return input.phone?.trim() || "—";
}

/** WhatsApp: nur Ja/Nein; abweichende Nummer nur wenn anders als Mobil. */
export function formatWhatsAppDisplay(input: {
  whatsapp_opt_in?: boolean;
  whatsapp_dial_code?: string | null;
  whatsapp_number?: string | null;
  phone?: string | null;
  mobile_dial_code?: string | null;
  mobile_number?: string | null;
}): string {
  if (!input.whatsapp_opt_in) return "Nein";
  const mobile = formatMemberMobile(input);
  const wa = input.whatsapp_number?.trim()
    ? `${input.whatsapp_dial_code ?? ""}${input.whatsapp_number}`.trim()
    : "";
  if (!wa || wa === mobile) return "Ja";
  return `Ja — ${wa}`;
}
