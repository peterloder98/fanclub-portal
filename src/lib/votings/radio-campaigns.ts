/** Fiktive Radio-Hörervotings — Anni in Charts pushen (Plays im Radio). */
export type RadioVotingCampaign = {
  id: string;
  station: string;
  region: string;
  chartName: string;
  votingUrl: string;
  endsAt: string;
  songTitle: string;
  instructions: string;
  steps: string[];
};

export const RADIO_VOTING_CAMPAIGNS: RadioVotingCampaign[] = [
  {
    id: "radio-hamburg-top845",
    station: "Radio Hamburg",
    region: "Hamburg & Schleswig-Holstein",
    chartName: "TOP 845",
    votingUrl: "https://www.radiohamburg.de/charts/top-845/voting",
    endsAt: "2026-06-15T20:00:00+02:00",
    songTitle: "Anni Perka — aktueller Titel",
    instructions:
      "Stimme für Anni in der TOP 845 ab — je höher der Platz, desto öfter läuft der Song im Programm.",
    steps: [
      "Link öffnen und ggf. Cookie-Banner bestätigen.",
      "Nach „Anni Perka“ oder dem Songtitel suchen.",
      "Song auswählen und Stimme abgeben (oft 1× täglich möglich).",
      "Seite offen lassen, bis „Danke für deine Stimme“ erscheint.",
    ],
  },
  {
    id: "ndr2-soundcheck",
    station: "NDR 2",
    region: "Norddeutschland",
    chartName: "Soundcheck",
    votingUrl: "https://www.ndr.de/radio/ndr2/sendungen/soundcheck/voting",
    endsAt: "2026-06-12T18:00:00+02:00",
    songTitle: "Anni Perka — Soundcheck-Kandidatin",
    instructions:
      "Im NDR-2-Soundcheck entscheidet das Publikum über neue Titel — Anni braucht deine Stimme für Rotation.",
    steps: [
      "Auf den Voting-Link tippen (NDR-Seite).",
      "Anni Perka in der Kandidatenliste finden.",
      "Auf „Abstimmen“ / Herz klicken.",
      "Bei Bedarf morgen erneut abstimmen — viele Charts erlauben tägliche Stimmen.",
    ],
  },
  {
    id: "bayern3-votes",
    station: "Bayern 3",
    region: "Bayern",
    chartName: "Bayern 3 Votes",
    votingUrl: "https://www.bayern3.de/bayern3votes",
    endsAt: "2026-06-20T23:59:00+02:00",
    songTitle: "Anni Perka — Bayern 3 Votes",
    instructions:
      "Bayern 3 Votes ist das Hörer-Voting des Senders — gute Platzierungen bringen mehr Airplay in Bayern und bundesweit.",
    steps: [
      "Voting-Seite öffnen und Anni Perka suchen.",
      "Titel markieren und Stimme abgeben.",
      "Optional: Link mit Freunden teilen, damit mehr Fans mitmachen.",
    ],
  },
  {
    id: "radio-regenbogen-top25",
    station: "Radio Regenbogen",
    region: "Baden-Württemberg",
    chartName: "TOP 25",
    votingUrl: "https://www.regenbogen.de/charts/top-25/voting",
    endsAt: "2026-06-18T21:00:00+02:00",
    songTitle: "Anni Perka — TOP-25-Kandidatin",
    instructions:
      "In der Radio-Regenbogen-TOP-25 kannst du Anni nach oben voten — Top-Plätze bedeuten häufigere Plays.",
    steps: [
      "Link öffnen → Chart-Voting aufrufen.",
      "Song von Anni Perka wählen.",
      "Stimme bestätigen — bei Regenbogen oft mehrfach pro Woche möglich.",
    ],
  },
  {
    id: "mdr-jump-livecharts",
    station: "MDR Jump",
    region: "Mitteldeutschland",
    chartName: "Live-Charts",
    votingUrl: "https://www.mdrjump.de/charts/live-charts/voting",
    endsAt: "2026-06-14T19:00:00+02:00",
    songTitle: "Anni Perka — Live-Charts",
    instructions:
      "MDR Jump Live-Charts: Hörerstimmen bestimmen die Playlist — hilf Anni in die vorderen Ränge.",
    steps: [
      "Voting-Link öffnen.",
      "Nach Anni Perka filtern oder in der Liste scrollen.",
      "Abstimmen und Erfolgsmeldung abwarten.",
      "Fanclub-Tipp: Erinnerung im Kalender für tägliches Voting setzen.",
    ],
  },
];

export function activeRadioCampaigns(now = Date.now()): RadioVotingCampaign[] {
  return RADIO_VOTING_CAMPAIGNS.filter((c) => new Date(c.endsAt).getTime() > now).sort(
    (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
  );
}
