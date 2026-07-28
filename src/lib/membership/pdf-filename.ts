/** Dateiname für Mitgliedsantrag-PDFs: Mitgliedsantrag_Vorname_Nachname.pdf */
export function membershipApplicationPdfFilename(firstName: string, lastName: string) {
  const sanitize = (s: string) =>
    s
      .trim()
      .replace(/[^\p{L}\p{N}\-_]+/gu, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  const first = sanitize(firstName) || "Vorname";
  const last = sanitize(lastName) || "Nachname";
  return `Mitgliedsantrag_${first}_${last}.pdf`;
}
