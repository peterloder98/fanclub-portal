/**
 * Grobe Regionalzentren für die Mitglieder-Karte (Datenschutz).
 * Keine Straßen-/PLZ-Genauigkeit — Snap auf nächste Stadt ca. ≥60–70k Einwohner,
 * immer nur innerhalb des Mitglieds-Landes (kein DE↔NL-Übergriff).
 */

export type RegionalCountry = "DE" | "AT" | "CH" | "NL";

export type RegionalCenter = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: RegionalCountry;
};

/** Städte ab ca. 60–70k (plus bewährte Oberzentren) in DE + Nachbarländern. */
export const REGIONAL_CENTERS: RegionalCenter[] = [
  // Nord
  { id: "de-flensburg", name: "Flensburg", lat: 54.7937, lng: 9.4469, country: "DE" },
  { id: "de-kiel", name: "Kiel", lat: 54.3233, lng: 10.1228, country: "DE" },
  { id: "de-luebeck", name: "Lübeck", lat: 53.8655, lng: 10.6866, country: "DE" },
  { id: "de-hamburg", name: "Hamburg", lat: 53.5511, lng: 9.9937, country: "DE" },
  { id: "de-bremen", name: "Bremen", lat: 53.0793, lng: 8.8017, country: "DE" },
  { id: "de-oldenburg", name: "Oldenburg", lat: 53.1435, lng: 8.2146, country: "DE" },
  { id: "de-wilhelmshaven", name: "Wilhelmshaven", lat: 53.5203, lng: 8.1061, country: "DE" },
  { id: "de-bremerhaven", name: "Bremerhaven", lat: 53.5396, lng: 8.5809, country: "DE" },
  { id: "de-cuxhaven", name: "Cuxhaven", lat: 53.8616, lng: 8.6941, country: "DE" },
  { id: "de-rostock", name: "Rostock", lat: 54.0924, lng: 12.0991, country: "DE" },
  { id: "de-schwerin", name: "Schwerin", lat: 53.6355, lng: 11.4012, country: "DE" },
  { id: "de-neubrandenburg", name: "Neubrandenburg", lat: 53.5575, lng: 13.2612, country: "DE" },
  { id: "de-stralsund", name: "Stralsund", lat: 54.3091, lng: 13.0818, country: "DE" },
  { id: "de-greifswald", name: "Greifswald", lat: 54.0958, lng: 13.3815, country: "DE" },
  // West / NRW / Niedersachsen
  { id: "de-osnabrueck", name: "Osnabrück", lat: 52.2799, lng: 8.0472, country: "DE" },
  { id: "de-muenster", name: "Münster", lat: 51.9607, lng: 7.6261, country: "DE" },
  { id: "de-bielefeld", name: "Bielefeld", lat: 52.0302, lng: 8.5325, country: "DE" },
  { id: "de-guetersloh", name: "Gütersloh", lat: 51.9032, lng: 8.3858, country: "DE" },
  { id: "de-hannover", name: "Hannover", lat: 52.3759, lng: 9.732, country: "DE" },
  { id: "de-hildesheim", name: "Hildesheim", lat: 52.1508, lng: 9.9511, country: "DE" },
  { id: "de-braunschweig", name: "Braunschweig", lat: 52.2689, lng: 10.5268, country: "DE" },
  { id: "de-wolfsburg", name: "Wolfsburg", lat: 52.4227, lng: 10.7865, country: "DE" },
  { id: "de-salzgitter", name: "Salzgitter", lat: 52.1503, lng: 10.3339, country: "DE" },
  { id: "de-goettingen", name: "Göttingen", lat: 51.5413, lng: 9.9158, country: "DE" },
  { id: "de-kassel", name: "Kassel", lat: 51.3127, lng: 9.4797, country: "DE" },
  { id: "de-dortmund", name: "Dortmund", lat: 51.5136, lng: 7.4653, country: "DE" },
  { id: "de-essen", name: "Essen", lat: 51.4556, lng: 7.0116, country: "DE" },
  { id: "de-bochum", name: "Bochum", lat: 51.4818, lng: 7.2162, country: "DE" },
  { id: "de-gelsenkirchen", name: "Gelsenkirchen", lat: 51.5135, lng: 7.0949, country: "DE" },
  { id: "de-duisburg", name: "Duisburg", lat: 51.4344, lng: 6.7623, country: "DE" },
  { id: "de-moers", name: "Moers", lat: 51.4513, lng: 6.6329, country: "DE" },
  { id: "de-duesseldorf", name: "Düsseldorf", lat: 51.2277, lng: 6.7735, country: "DE" },
  { id: "de-neuss", name: "Neuss", lat: 51.2042, lng: 6.6879, country: "DE" },
  { id: "de-koeln", name: "Köln", lat: 50.9375, lng: 6.9603, country: "DE" },
  { id: "de-leverkusen", name: "Leverkusen", lat: 51.0459, lng: 6.9841, country: "DE" },
  { id: "de-bonn", name: "Bonn", lat: 50.7374, lng: 7.0982, country: "DE" },
  { id: "de-aachen", name: "Aachen", lat: 50.7753, lng: 6.0839, country: "DE" },
  { id: "de-moenchengladbach", name: "Mönchengladbach", lat: 51.1805, lng: 6.4428, country: "DE" },
  { id: "de-krefeld", name: "Krefeld", lat: 51.3388, lng: 6.5853, country: "DE" },
  { id: "de-wuppertal", name: "Wuppertal", lat: 51.2562, lng: 7.1508, country: "DE" },
  { id: "de-solingen", name: "Solingen", lat: 51.1652, lng: 7.0671, country: "DE" },
  { id: "de-remscheid", name: "Remscheid", lat: 51.1787, lng: 7.1896, country: "DE" },
  { id: "de-hagen", name: "Hagen", lat: 51.3671, lng: 7.4633, country: "DE" },
  { id: "de-hamm", name: "Hamm", lat: 51.6739, lng: 7.8159, country: "DE" },
  { id: "de-herne", name: "Herne", lat: 51.5369, lng: 7.2001, country: "DE" },
  { id: "de-recklinghausen", name: "Recklinghausen", lat: 51.6141, lng: 7.1979, country: "DE" },
  { id: "de-paderborn", name: "Paderborn", lat: 51.7189, lng: 8.7575, country: "DE" },
  { id: "de-siegen", name: "Siegen", lat: 50.8748, lng: 8.0243, country: "DE" },
  // Mitte / Ost
  { id: "de-berlin", name: "Berlin", lat: 52.52, lng: 13.405, country: "DE" },
  { id: "de-potsdam", name: "Potsdam", lat: 52.3906, lng: 13.0645, country: "DE" },
  { id: "de-frankfurt-oder", name: "Frankfurt (Oder)", lat: 52.3472, lng: 14.5506, country: "DE" },
  { id: "de-cottbus", name: "Cottbus", lat: 51.7563, lng: 14.3329, country: "DE" },
  { id: "de-magdeburg", name: "Magdeburg", lat: 52.1205, lng: 11.6276, country: "DE" },
  { id: "de-halle", name: "Halle (Saale)", lat: 51.4969, lng: 11.9688, country: "DE" },
  { id: "de-leipzig", name: "Leipzig", lat: 51.3397, lng: 12.3731, country: "DE" },
  { id: "de-dresden", name: "Dresden", lat: 51.0504, lng: 13.7373, country: "DE" },
  { id: "de-chemnitz", name: "Chemnitz", lat: 50.8278, lng: 12.9214, country: "DE" },
  { id: "de-zwickau", name: "Zwickau", lat: 50.7189, lng: 12.4922, country: "DE" },
  { id: "de-erfurt", name: "Erfurt", lat: 50.9848, lng: 11.0299, country: "DE" },
  { id: "de-weimar", name: "Weimar", lat: 50.9795, lng: 11.3235, country: "DE" },
  { id: "de-jena", name: "Jena", lat: 50.9271, lng: 11.5892, country: "DE" },
  { id: "de-gera", name: "Gera", lat: 50.8805, lng: 12.0826, country: "DE" },
  { id: "de-dessau", name: "Dessau-Roßlau", lat: 51.8306, lng: 12.2456, country: "DE" },
  // Rhein-Main / Südwest
  { id: "de-frankfurt", name: "Frankfurt am Main", lat: 50.1109, lng: 8.6821, country: "DE" },
  { id: "de-offenbach", name: "Offenbach", lat: 50.1006, lng: 8.7665, country: "DE" },
  { id: "de-wiesbaden", name: "Wiesbaden", lat: 50.0782, lng: 8.2398, country: "DE" },
  { id: "de-mainz", name: "Mainz", lat: 49.9929, lng: 8.2473, country: "DE" },
  { id: "de-darmstadt", name: "Darmstadt", lat: 49.8728, lng: 8.6512, country: "DE" },
  { id: "de-giessen", name: "Gießen", lat: 50.5841, lng: 8.6784, country: "DE" },
  { id: "de-fulda", name: "Fulda", lat: 50.5558, lng: 9.6808, country: "DE" },
  { id: "de-koblenz", name: "Koblenz", lat: 50.3569, lng: 7.589, country: "DE" },
  { id: "de-trier", name: "Trier", lat: 49.7497, lng: 6.6371, country: "DE" },
  { id: "de-saarbruecken", name: "Saarbrücken", lat: 49.2402, lng: 6.9969, country: "DE" },
  { id: "de-kaiserslautern", name: "Kaiserslautern", lat: 49.4401, lng: 7.7491, country: "DE" },
  { id: "de-ludwigshafen", name: "Ludwigshafen", lat: 49.4774, lng: 8.4452, country: "DE" },
  { id: "de-mannheim", name: "Mannheim", lat: 49.4875, lng: 8.466, country: "DE" },
  { id: "de-heidelberg", name: "Heidelberg", lat: 49.3988, lng: 8.6724, country: "DE" },
  { id: "de-karlsruhe", name: "Karlsruhe", lat: 49.0069, lng: 8.4037, country: "DE" },
  { id: "de-pforzheim", name: "Pforzheim", lat: 48.8921, lng: 8.6949, country: "DE" },
  { id: "de-stuttgart", name: "Stuttgart", lat: 48.7758, lng: 9.1829, country: "DE" },
  { id: "de-heilbronn", name: "Heilbronn", lat: 49.1427, lng: 9.2109, country: "DE" },
  { id: "de-ulm", name: "Ulm", lat: 48.4011, lng: 9.9876, country: "DE" },
  { id: "de-reutlingen", name: "Reutlingen", lat: 48.4914, lng: 9.2045, country: "DE" },
  { id: "de-tuebingen", name: "Tübingen", lat: 48.5216, lng: 9.0576, country: "DE" },
  { id: "de-freiburg", name: "Freiburg", lat: 47.999, lng: 7.8421, country: "DE" },
  { id: "de-konstanz", name: "Konstanz", lat: 47.6779, lng: 9.1732, country: "DE" },
  { id: "de-offenburg", name: "Offenburg", lat: 48.4737, lng: 7.9448, country: "DE" },
  // Bayern
  { id: "de-nuernberg", name: "Nürnberg", lat: 49.4521, lng: 11.0767, country: "DE" },
  { id: "de-fuerth", name: "Fürth", lat: 49.4774, lng: 10.9886, country: "DE" },
  { id: "de-erlangen", name: "Erlangen", lat: 49.5897, lng: 11.012, country: "DE" },
  { id: "de-wuerzburg", name: "Würzburg", lat: 49.7913, lng: 9.9534, country: "DE" },
  { id: "de-bamberg", name: "Bamberg", lat: 49.8988, lng: 10.9028, country: "DE" },
  { id: "de-bayreuth", name: "Bayreuth", lat: 49.9456, lng: 11.5713, country: "DE" },
  { id: "de-regensburg", name: "Regensburg", lat: 49.0134, lng: 12.1016, country: "DE" },
  { id: "de-ingolstadt", name: "Ingolstadt", lat: 48.7665, lng: 11.4258, country: "DE" },
  { id: "de-augsburg", name: "Augsburg", lat: 48.3705, lng: 10.8978, country: "DE" },
  { id: "de-muenchen", name: "München", lat: 48.1351, lng: 11.582, country: "DE" },
  { id: "de-landshut", name: "Landshut", lat: 48.5369, lng: 12.152, country: "DE" },
  { id: "de-passau", name: "Passau", lat: 48.5665, lng: 13.4312, country: "DE" },
  { id: "de-rosenheim", name: "Rosenheim", lat: 47.8561, lng: 12.1289, country: "DE" },
  { id: "de-kempten", name: "Kempten", lat: 47.7267, lng: 10.3168, country: "DE" },
  { id: "de-memmingen", name: "Memmingen", lat: 47.9836, lng: 10.1853, country: "DE" },
  { id: "de-schweinfurt", name: "Schweinfurt", lat: 50.0489, lng: 10.2217, country: "DE" },
  // AT (~60k+)
  { id: "at-wien", name: "Wien", lat: 48.2082, lng: 16.3738, country: "AT" },
  { id: "at-graz", name: "Graz", lat: 47.0707, lng: 15.4395, country: "AT" },
  { id: "at-linz", name: "Linz", lat: 48.3069, lng: 14.2858, country: "AT" },
  { id: "at-salzburg", name: "Salzburg", lat: 47.8095, lng: 13.055, country: "AT" },
  { id: "at-innsbruck", name: "Innsbruck", lat: 47.2692, lng: 11.4041, country: "AT" },
  { id: "at-klagenfurt", name: "Klagenfurt", lat: 46.6247, lng: 14.3053, country: "AT" },
  { id: "at-villach", name: "Villach", lat: 46.6111, lng: 13.8558, country: "AT" },
  { id: "at-wels", name: "Wels", lat: 48.1575, lng: 14.0289, country: "AT" },
  { id: "at-sankt-poelten", name: "St. Pölten", lat: 48.2047, lng: 15.6256, country: "AT" },
  // CH (~60k+)
  { id: "ch-zuerich", name: "Zürich", lat: 47.3769, lng: 8.5417, country: "CH" },
  { id: "ch-genf", name: "Genf", lat: 46.2044, lng: 6.1432, country: "CH" },
  { id: "ch-basel", name: "Basel", lat: 47.5596, lng: 7.5886, country: "CH" },
  { id: "ch-lausanne", name: "Lausanne", lat: 46.5197, lng: 6.6323, country: "CH" },
  { id: "ch-bern", name: "Bern", lat: 46.948, lng: 7.4474, country: "CH" },
  { id: "ch-winterthur", name: "Winterthur", lat: 47.4988, lng: 8.7237, country: "CH" },
  { id: "ch-luzern", name: "Luzern", lat: 47.0502, lng: 8.3093, country: "CH" },
  { id: "ch-sankt-gallen", name: "St. Gallen", lat: 47.4245, lng: 9.3767, country: "CH" },
  { id: "ch-lugano", name: "Lugano", lat: 46.0037, lng: 8.9511, country: "CH" },
  { id: "ch-biel", name: "Biel/Bienne", lat: 47.1368, lng: 7.2467, country: "CH" },
  { id: "ch-thun", name: "Thun", lat: 46.758, lng: 7.628, country: "CH" },
  // NL (~60–70k+)
  { id: "nl-amsterdam", name: "Amsterdam", lat: 52.3676, lng: 4.9041, country: "NL" },
  { id: "nl-rotterdam", name: "Rotterdam", lat: 51.9244, lng: 4.4777, country: "NL" },
  { id: "nl-den-haag", name: "Den Haag", lat: 52.0705, lng: 4.3007, country: "NL" },
  { id: "nl-utrecht", name: "Utrecht", lat: 52.0907, lng: 5.1214, country: "NL" },
  { id: "nl-eindhoven", name: "Eindhoven", lat: 51.4416, lng: 5.4697, country: "NL" },
  { id: "nl-groningen", name: "Groningen", lat: 53.2194, lng: 6.5665, country: "NL" },
  { id: "nl-tilburg", name: "Tilburg", lat: 51.5555, lng: 5.0913, country: "NL" },
  { id: "nl-almere", name: "Almere", lat: 52.3508, lng: 5.2647, country: "NL" },
  { id: "nl-breda", name: "Breda", lat: 51.5719, lng: 4.7683, country: "NL" },
  { id: "nl-nijmegen", name: "Nijmegen", lat: 51.8126, lng: 5.8372, country: "NL" },
  { id: "nl-apeldoorn", name: "Apeldoorn", lat: 52.2112, lng: 5.9699, country: "NL" },
  { id: "nl-haarlem", name: "Haarlem", lat: 52.3874, lng: 4.6462, country: "NL" },
  { id: "nl-arnhem", name: "Arnhem", lat: 51.9851, lng: 5.8987, country: "NL" },
  { id: "nl-enschede", name: "Enschede", lat: 52.2215, lng: 6.8937, country: "NL" },
  { id: "nl-amersfoort", name: "Amersfoort", lat: 52.1561, lng: 5.3878, country: "NL" },
  { id: "nl-zwolle", name: "Zwolle", lat: 52.5168, lng: 6.083, country: "NL" },
  { id: "nl-leiden", name: "Leiden", lat: 52.1601, lng: 4.497, country: "NL" },
  { id: "nl-maastricht", name: "Maastricht", lat: 50.8514, lng: 5.691, country: "NL" },
  { id: "nl-dordrecht", name: "Dordrecht", lat: 51.8133, lng: 4.6901, country: "NL" },
  { id: "nl-venlo", name: "Venlo", lat: 51.3704, lng: 6.1724, country: "NL" },
  { id: "nl-deventer", name: "Deventer", lat: 52.255, lng: 6.1639, country: "NL" },
  { id: "nl-hengelo", name: "Hengelo", lat: 52.2659, lng: 6.7931, country: "NL" },
  { id: "nl-almelo", name: "Almelo", lat: 52.357, lng: 6.6626, country: "NL" },
  { id: "nl-heerlen", name: "Heerlen", lat: 50.8882, lng: 5.9795, country: "NL" },
  { id: "nl-hilversum", name: "Hilversum", lat: 52.2292, lng: 5.1669, country: "NL" },
];

const EARTH_KM = 6371;
/** Kurze Ortsfragmente ("Ei") dürfen keine Städte per Prefix matchen. */
const MIN_NAME_PREFIX_LEN = 4;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(x)));
}

function normalizeCityName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCountry(country?: string | null): RegionalCountry | null {
  const c = (country ?? "").trim().toUpperCase();
  if (c === "DE" || c === "DEU" || c === "DEUTSCHLAND" || c === "GERMANY" || c === "D") return "DE";
  if (c === "AT" || c === "AUT" || c === "OESTERREICH" || c === "ÖSTERREICH" || c === "AUSTRIA")
    return "AT";
  if (
    c === "CH" ||
    c === "CHE" ||
    c === "SCHWEIZ" ||
    c === "SWITZERLAND" ||
    c === "SUISSE"
  )
    return "CH";
  if (
    c === "NL" ||
    c === "NLD" ||
    c === "NIEDERLANDE" ||
    c === "NIEDERANDE" ||
    c === "HOLLAND" ||
    c === "NETHERLANDS"
  )
    return "NL";
  return null;
}

export function centersForCountry(country?: string | null): RegionalCenter[] {
  const code = normalizeCountry(country);
  if (!code) return REGIONAL_CENTERS;
  return REGIONAL_CENTERS.filter((c) => c.country === code);
}

function nearestCenter(lat: number, lng: number, pool: RegionalCenter[]): RegionalCenter {
  let best = pool[0] ?? REGIONAL_CENTERS[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const c of pool) {
    const km = haversineKm({ lat, lng }, c);
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }
  return best;
}

/**
 * Nächstes Regionalzentrum im gleichen Land.
 * Optional: Ortsname bevorzugen, wenn er eindeutig zu einem Zentrum passt.
 */
export function snapToRegionalCenter(
  lat: number,
  lng: number,
  preferredCity?: string | null,
  country?: string | null,
): RegionalCenter {
  const pool = centersForCountry(country);
  const preferred = preferredCity ? normalizeCityName(preferredCity) : "";
  if (preferred) {
    const exact = pool.find((c) => normalizeCityName(c.name) === preferred);
    if (exact) return exact;

    const nameMatches = pool.filter((c) => {
      const n = normalizeCityName(c.name);
      if (n === preferred) return true;
      // "Frankfurt" ↔ "Frankfurt am Main" / "Frankfurt (Oder)"
      if (n.startsWith(`${preferred} `) || preferred.startsWith(`${n} `)) return true;
      // Prefix nur ab sinnvoller Länge (verhindert "Ei" → Eindhoven)
      if (preferred.length >= MIN_NAME_PREFIX_LEN && n.startsWith(preferred)) return true;
      if (n.length >= MIN_NAME_PREFIX_LEN && preferred.startsWith(n)) return true;
      return false;
    });
    if (nameMatches.length === 1) return nameMatches[0];
    if (nameMatches.length > 1) return nearestCenter(lat, lng, nameMatches);
  }

  return nearestCenter(lat, lng, pool);
}

/** true, wenn gespeicherte Koordinaten noch nicht auf einem Regionalzentrum liegen. */
export function needsRegionalSnap(
  lat: number,
  lng: number,
  maxKm = 3,
  country?: string | null,
): boolean {
  const center = snapToRegionalCenter(lat, lng, null, country);
  return haversineKm({ lat, lng }, center) > maxKm;
}

export function regionMapLabel(center: RegionalCenter, count: number): string {
  const where = `Raum ${center.name}`;
  return count === 1 ? `${where} · 1 Mitglied` : `${where} · ${count} Mitglieder`;
}
