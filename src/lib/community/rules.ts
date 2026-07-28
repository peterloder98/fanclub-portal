export const COMMUNITY_RULES_PATH = "/regeln";

export type CommunityRule = {
  number: number;
  title: string;
  body: string;
};

export const COMMUNITY_RULES_TITLE = "Fanclub-Regeln";
export const COMMUNITY_RULES_SUBTITLE = "WhatsApp-Gruppe & Fanclub App";

export const COMMUNITY_RULES_INTRO =
  "Damit wir uns alle wohlfühlen, gelten diese Regeln in der offiziellen WhatsApp-Gruppe und in der Anni Perka Fanclub App — in Beiträgen, Kommentaren, Umfragen und im Gruppenchat.";

export const COMMUNITY_RULES: CommunityRule[] = [
  {
    number: 1,
    title: "Respektvoller Umgang",
    body: "Wir gehen freundlich und respektvoll miteinander um. Keine Beleidigungen, kein Mobbing und keine persönlichen Angriffe.",
  },
  {
    number: 2,
    title: "Beim Thema bleiben",
    body: "Beide Kanäle sind für Fanclub-Themen gedacht: Treffen, Events, Aktionen und Infos rund um Anni und den Fanclub. Bitte keine themenfremden Diskussionen.",
  },
  {
    number: 3,
    title: "Kein Spam",
    body: "Keine Kettenbriefe, Werbung, unnötige Weiterleitungen oder wiederholte Nachrichten. Auch in der App bitte keine Spam-Beiträge, -Kommentare oder Chat-Nachrichten.",
  },
  {
    number: 4,
    title: "Keine sensiblen Daten teilen",
    body: "Persönliche Daten (Adresse, Telefonnummer, Kontodaten usw.) nur privat austauschen — nicht in der Gruppe, nicht im Chat und nicht in Beiträgen oder Kommentaren.",
  },
  {
    number: 5,
    title: "Diskussionen sachlich führen",
    body: "Unterschiedliche Meinungen sind willkommen. Bitte respektvoll und sachlich bleiben.",
  },
  {
    number: 6,
    title: "Keine unangemessenen Inhalte",
    body: "Keine beleidigenden, diskriminierenden, sexuell expliziten oder jugendgefährdenden Inhalte — weder in Texten noch in Bildern, Videos oder Links.",
  },
  {
    number: 7,
    title: "Admin-Entscheidungen akzeptieren",
    body: "Die Admins sorgen für Ordnung in WhatsApp und in der App. Bei Regelverstößen können Nachrichten, Beiträge oder Kommentare gelöscht und Verwarnungen ausgesprochen werden.",
  },
  {
    number: 8,
    title: "Exklusive Informationen vertraulich behandeln",
    body: "Exklusive Infos (z. B. Termine, Aktionen, Gewinnspiele, Neuigkeiten) sind nur für Fanclub-Mitglieder gedacht und dürfen nicht vorab oder ohne Zustimmung öffentlich weitergegeben werden.",
  },
  {
    number: 9,
    title: "Spaß haben",
    body: "Am Ende geht es um die gemeinsame Freude an Annis Musik und den Austausch mit anderen Fans.",
  },
];

export const COMMUNITY_RULES_ACCEPTANCE_LABEL =
  "Ich habe die Fanclub-Regeln gelesen und stimme zu, mich in der WhatsApp-Gruppe und in der Fanclub App daran zu halten.";

export function communityRulesUrl(baseUrl?: string) {
  const path = COMMUNITY_RULES_PATH;
  const base = baseUrl?.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}
