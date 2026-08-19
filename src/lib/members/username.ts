const GERMAN_CHAR_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  ß: "ss",
  Ä: "ae",
  Ö: "oe",
  Ü: "ue",
};

function transliterateGerman(input: string) {
  return input.replace(/[äöüßÄÖÜ]/g, (ch) => GERMAN_CHAR_MAP[ch] ?? ch);
}

/** Login-/Profil-Benutzername aus Vor- und Nachname (ae/oe/ue/ss, Kleinbuchstaben, Punkte). */
export function slugifyMemberUsername(first: string, last: string) {
  const slug = `${transliterateGerman(first.trim())}.${transliterateGerman(last.trim())}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");
  return slug || "member";
}
