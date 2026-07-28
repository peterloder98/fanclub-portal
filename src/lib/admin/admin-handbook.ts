/**
 * Admin-Handbuch (nur für Vorstände / role=admin).
 *
 * Quelle für /admin/hilfe. Bei neuen Admin-Abläufen hier ergänzen.
 */

export type AdminHandbookBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string }
  | { type: "link"; href: string; label: string; hint?: string };

export type AdminHandbookSection = {
  id: string;
  title: string;
  summary: string;
  blocks: AdminHandbookBlock[];
};

export const ADMIN_HANDBOOK_UPDATED = "2026-07-28";

export const ADMIN_HANDBOOK_INTRO =
  "Hier steht in Ruhe, was die Fanclub-App kann und wie ihr als Vorstand die wichtigsten Dinge erledigt. Nur der Vorstand sieht diese Seite. Einfach dem jeweiligen Thema folgen — Schritt für Schritt.";

export const ADMIN_HANDBOOK_SECTIONS: AdminHandbookSection[] = [
  {
    id: "start",
    title: "So findest du den Admin-Bereich",
    summary: "Einstieg und Übersicht",
    blocks: [
      {
        type: "p",
        text: "Nach dem Login siehst du in der App oben oder im Menü den Bereich „Admin“. Dort sind alle Verwaltungsaufgaben nach Themen sortiert (Mitglieder, Finanzen, E-Mail, Community, …).",
      },
      {
        type: "ol",
        items: [
          "In der App anmelden (wie jedes Mitglied).",
          "„Admin“ öffnen — du landest auf der Übersicht.",
          "Ein Thema antippen (z. B. „Mitglieder & Anträge“) und dort weiterarbeiten.",
        ],
      },
      {
        type: "note",
        text: "Du kannst die App weiterhin ganz normal als Mitglied nutzen (Chat, Events, Profil). Der Admin-Bereich ist zusätzlich — nur für den Vorstand sichtbar.",
      },
      {
        type: "link",
        href: "/admin",
        label: "Zur Admin-Übersicht",
      },
    ],
  },
  {
    id: "was-kann-die-app",
    title: "Was die App für Mitglieder kann",
    summary: "Damit du weißt, was Mitglieder erleben",
    blocks: [
      {
        type: "p",
        text: "Die App ist der digitale Treffpunkt des Fanclubs. Mitglieder können u. a.:",
      },
      {
        type: "ul",
        items: [
          "Beiträge lesen und schreiben, kommentieren und im Gruppenchat schreiben",
          "an Umfragen und Gewinnspielen teilnehmen",
          "Konzerte und Fanclub-Treffen sehen und „Ich bin dabei“ markieren",
          "andere Mitglieder im Verzeichnis finden und Profile anschauen",
          "Anni-Stars sammeln und Badges freischalten",
          "den Mitgliedsantrag digital ausfüllen und den Beitrag überweisen",
        ],
      },
      {
        type: "p",
        text: "Umfragen und Gewinnspiele legst du nicht im Admin-Hub an, sondern in den normalen Menüpunkten „Umfragen“ bzw. „Gewinnspiele“ — dort hast du als Vorstand zusätzliche Buttons zum Steuern.",
      },
    ],
  },
  {
    id: "antraege",
    title: "Neue Mitglieder aufnehmen",
    summary: "Vom Antrag bis zur Freischaltung",
    blocks: [
      {
        type: "p",
        text: "Interessierte melden sich über die Seite „Mitglied werden“. Der Antrag landet bei euch zur Prüfung.",
      },
      {
        type: "ol",
        items: [
          "Öffne Admin → „Mitglieder & Anträge“.",
          "Schau dir offene Anträge an (Daten, Unterschrift, PDF).",
          "Wenn alles passt: Antrag freigeben. Die Person bekommt eine Mitgliedsnummer und die Einladung, den App-Zugang einzurichten.",
          "Der Mitgliedsbeitrag (15 € für das laufende Kalenderjahr) wird danach erwartet — Erinnerung kannst du aus dem Mitglieder-Detail senden.",
        ],
      },
      {
        type: "note",
        text: "Der Verwendungszweck bei Überweisungen lautet z. B. „Beitrag 2026, Nr. 42, Max Mustermann“ (Jahr, Nummer, Vorname Nachname). So findet ihr Zahlungen leichter zu.",
      },
      {
        type: "link",
        href: "/admin/members",
        label: "Mitglieder & Anträge öffnen",
      },
      {
        type: "link",
        href: "/admin/membership-form",
        label: "Antrags-Link / Formular",
        hint: "Zum Teilen mit Interessierten",
      },
    ],
  },
  {
    id: "beitraege",
    title: "Mitgliedsbeiträge erinnern und prüfen",
    summary: "Offene Beträge, Erinnerungs-Mails, App-Zugang sperren",
    blocks: [
      {
        type: "p",
        text: "Der Beitrag gilt immer für ein Kalenderjahr (1. Januar bis 31. Dezember), auch wenn jemand mitten im Jahr beitritt. Ab dem nächsten 1. Januar ist das neue Jahr wieder fällig.",
      },
      {
        type: "ol",
        items: [
          "Mitglied in „Mitglieder & Anträge“ öffnen.",
          "Unter Beiträgen siehst du offene Jahre (und ob etwas überfällig ist — das ist 14 Tage nach Fälligkeit).",
          "„Beitrags-Erinnerung senden“ tippen: Die Mail geht an das Mitglied mit Betrag, Kontodaten und dem richtigen Verwendungszweck.",
          "Wenn das Geld da ist: Zahlung in der Buchhaltung / bei den Zahlungen zuordnen bzw. bestätigen.",
        ],
      },
      {
        type: "p",
        text: "Zahlt jemand länger nicht, könnt ihr den App-Zugang vorübergehend deaktivieren. Das Mitglied sieht dann einen Hinweis und kann die App nicht nutzen, bis ihr den Zugang wieder freischaltet.",
      },
      {
        type: "link",
        href: "/admin/members",
        label: "Zur Mitgliederliste",
      },
      {
        type: "link",
        href: "/admin/payments",
        label: "Zahlungen",
      },
      {
        type: "link",
        href: "/admin/accounting",
        label: "Buchhaltung",
      },
    ],
  },
  {
    id: "stammdaten",
    title: "Stammdaten-Änderungen freigeben",
    summary: "Wenn Mitglieder Adresse oder Daten ändern wollen",
    blocks: [
      {
        type: "ol",
        items: [
          "Mitglieder können im Profil Änderungen beantragen (z. B. Adresse).",
          "Unter Admin → „Stammdaten freigeben“ erscheint die Warteschlange.",
          "Prüfen und annehmen oder ablehnen — erst dann gilt die Änderung offiziell.",
        ],
      },
      {
        type: "link",
        href: "/admin/members/profile-changes",
        label: "Stammdaten freigeben",
      },
    ],
  },
  {
    id: "empfehlungen",
    title: "Mitglieder werben",
    summary: "Einladungen und Sterne fürs Werben",
    blocks: [
      {
        type: "p",
        text: "Mitglieder können unter „Neues Mitglied werben“ eine Einladung per E-Mail schicken. Dafür gibt es Anni-Stars als Dankeschön.",
      },
      {
        type: "ul",
        items: [
          "Beim erfolgreichen Versand der Einladung: 20 Anni-Stars",
          "Wenn die eingeladene Person freigeschaltet wird: zusätzlich 70 Anni-Stars",
          "Unter Admin → „Empfehlungen“ seht ihr, wer wen eingeladen hat",
        ],
      },
      {
        type: "link",
        href: "/admin/referrals",
        label: "Empfehlungen ansehen",
      },
    ],
  },
  {
    id: "emails",
    title: "E-Mails schreiben und prüfen",
    summary: "Vorlagen, Absender, Signatur, Versandkontrolle",
    blocks: [
      {
        type: "p",
        text: "Viele Mails (Willkommen, Beitragserinnerung, App-Zugang, …) kommen aus fertigen Vorlagen. Ihr müsst den Text nicht jedes Mal neu tippen — nur bei Bedarf anpassen.",
      },
      {
        type: "ol",
        items: [
          "„Email Konten“: Hier steht der Absender der App (offizielle Fanclub-Adresse). Verbindung einmal testen, wenn etwas nicht ankommt.",
          "„E-Mail-Vorlagen“: Texte und Betreffzeilen ändern. Die Anrede (Lieber/Liebe …) und die Unterschrift werden automatisch eingesetzt.",
          "„Signaturen“: Die gemeinsame Fanclub-Unterschrift pflegen (Text und ggf. Bild).",
          "„E-Mail-Historie“: Nachschauen, ob eine Mail rausging — und bei Bedarf erneut senden.",
        ],
      },
      {
        type: "note",
        text: "Zurzeit dürfen Test-Mails nur an die Vorstände und die offizielle App-Adresse gehen. So schreiben wir versehentlich niemandem aus der Mitgliedschaft. Wenn ihr echte Mitglieder anschreiben wollt, sagt Bescheid — dann wird der Versand freigeschaltet.",
      },
      {
        type: "link",
        href: "/admin/settings/email-templates",
        label: "E-Mail-Vorlagen",
      },
      {
        type: "link",
        href: "/admin/settings/email-log",
        label: "E-Mail-Historie",
      },
      {
        type: "link",
        href: "/admin/signatures",
        label: "Signaturen",
      },
    ],
  },
  {
    id: "community",
    title: "Beiträge freigeben und Fairplay",
    summary: "Moderation im Alltag",
    blocks: [
      {
        type: "ol",
        items: [
          "Mitglieder können Beiträge einreichen — unter „Beiträge freigeben“ entscheidet ihr: sichtbar machen oder ablehnen.",
          "Bei Regelverstößen könnt ihr Verwarnungen aussprechen (das Mitglied bekommt einen Hinweis in der App und per E-Mail).",
          "Umfragen und Gewinnspiele: im jeweiligen Menü anlegen, pausieren oder auslosen — dort erscheinen eure Admin-Schaltflächen.",
        ],
      },
      {
        type: "link",
        href: "/admin/posts",
        label: "Beiträge freigeben",
      },
    ],
  },
  {
    id: "termine",
    title: "Termine und Fanclub-Treffen",
    summary: "Konzerte, TV und eigene Treffen",
    blocks: [
      {
        type: "p",
        text: "Öffentliche Konzerte und TV-Termine kommen in der Regel automatisch in die App (Sync). Eigene Fanclub-Treffen legt ihr selbst an.",
      },
      {
        type: "ol",
        items: [
          "Fanclub-Treffen: Admin → „Fanclub-Treffen“ → neues Treffen mit Ort, Zeit und ggf. Kosten.",
          "Mitglieder melden sich in der App an — im Profil erscheint das unter „Hier bin ich dabei“.",
          "Wenn Termine fehlen oder veraltet sind: unter „Artistflow-Sync“ den Abgleich anstoßen bzw. prüfen.",
        ],
      },
      {
        type: "link",
        href: "/admin/treffen",
        label: "Fanclub-Treffen",
      },
      {
        type: "link",
        href: "/admin/events-sync",
        label: "Termine abgleichen",
      },
    ],
  },
  {
    id: "punkte",
    title: "Anni-Stars und Badges",
    summary: "Was Mitglieder sammeln — und warum",
    blocks: [
      {
        type: "p",
        text: "Anni-Stars belohnen Mitmachen (Umfragen, Kommentare, Events, Werben, …). Die Sterne zählen für das laufende Kalenderjahr und starten jedes Jahr neu. Badges (z. B. Konzertprofi) bleiben dauerhaft.",
      },
      {
        type: "ul",
        items: [
          "Ränge zeigen den Stand im Jahr (z. B. Aktiv-Fan, Gold-Fan).",
          "Für eigene Beiträge oder eigene Umfragen gibt es keine Sterne — das bleibt fair.",
          "Zum Jahresende nehmen die Top 10 der Jahres-Sterne an einer Sonderverlosung teil.",
        ],
      },
      {
        type: "link",
        href: "/punkte",
        label: "So sehen Mitglieder ihre Sterne",
      },
    ],
  },
  {
    id: "statistik",
    title: "App-Statistik und Protokoll",
    summary: "Überblick behalten",
    blocks: [
      {
        type: "ul",
        items: [
          "App-Statistik: Wie viele aktive Mitglieder es gibt und wie die App genutzt wird.",
          "Audit-Log: Wer im Admin-Bereich wann wichtige Dinge geändert hat — zur Nachvollziehbarkeit.",
        ],
      },
      {
        type: "link",
        href: "/admin/app-stats",
        label: "App-Statistik",
      },
      {
        type: "link",
        href: "/admin/audit",
        label: "Protokoll (Audit)",
      },
    ],
  },
];
