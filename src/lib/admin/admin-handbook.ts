/**
 * Admin-Handbuch (nur für Vorstände / role=admin).
 * Quelle für /admin/hilfe — bei neuen Admin-Abläufen hier ergänzen.
 */

export type AdminHandbookBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "note"; text: string }
  | { type: "link"; href: string; label: string; hint?: string };

export type AdminHandbookSection = {
  id: string;
  /** Fortlaufende Nummer im Inhaltsverzeichnis, z. B. „3.2“ */
  number: string;
  title: string;
  summary: string;
  blocks: AdminHandbookBlock[];
};

export type AdminHandbookChapter = {
  id: string;
  /** Kapitelnummer, z. B. „3“ */
  number: string;
  title: string;
  sections: AdminHandbookSection[];
};

export const ADMIN_HANDBOOK_UPDATED = "2026-07-29";

export const ADMIN_HANDBOOK_INTRO =
  "Diese Hilfe erklärt Schritt für Schritt, was ihr als Vorstand in der Fanclub-App erledigen könnt. Oben findet ihr das Inhaltsverzeichnis nach Themen — tippt einen Punkt an, um dorthin zu springen.";

export const ADMIN_HANDBOOK_CHAPTERS: AdminHandbookChapter[] = [
  {
    id: "einstieg",
    number: "1",
    title: "Einstieg",
    sections: [
      {
        id: "admin-finden",
        number: "1.1",
        title: "Admin-Bereich öffnen",
        summary: "Wo ihr die Verwaltung findet",
        blocks: [
          {
            type: "ol",
            items: [
              "Wie gewohnt in der App anmelden.",
              "Im Menü oder auf dem Dashboard „Admin“ öffnen.",
              "Ihr seht eine Übersicht mit Themen (Mitglieder, Finanzen, E-Mail, …).",
              "Ein Thema antippen und dort weiterarbeiten.",
            ],
          },
          {
            type: "note",
            text: "Wichtig: Umfragen und Gewinnspiele liegen nicht im Admin-Hub, sondern in den normalen Menüpunkten „Umfragen“ und „Gewinnspiele“. Dort erscheinen für euch zusätzliche Buttons.",
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
        number: "1.2",
        title: "Was Mitglieder in der App können",
        summary: "Kurzüberblick",
        blocks: [
          {
            type: "ul",
            items: [
              "Beiträge lesen und schreiben, kommentieren, im Gruppenchat schreiben",
              "an Umfragen und Gewinnspielen teilnehmen",
              "Konzerte und Fanclub-Treffen sehen und „Ich bin dabei“ markieren",
              "andere Mitglieder finden und Profile anschauen",
              "Anni-Stars sammeln und Badges freischalten",
              "sich digital als Mitglied anmelden und den Beitrag überweisen",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "mitglieder",
    number: "2",
    title: "Mitglieder & Beiträge",
    sections: [
      {
        id: "antraege",
        number: "2.1",
        title: "Neue Mitglieder aufnehmen",
        summary: "Antrag prüfen, Beitrag, freischalten",
        blocks: [
          {
            type: "p",
            text: "Sobald jemand den digitalen Antrag absendet, werdet ihr als Vorstand sofort informiert: per E-Mail und per Benachrichtigung in der App. In der Benachrichtigung könnt ihr direkt auf den Antrag tippen und ihn öffnen.",
          },
          {
            type: "ol",
            items: [
              "Admin → „Mitglieder & Anträge“ öffnen (oder den Link in der Benachrichtigung/E-Mail antippen).",
              "Offenen Antrag antippen und Daten sowie Unterschrift prüfen.",
              "Mit dem Antrag wird automatisch eine offene Zahlung per Banküberweisung angelegt. Der Beitrag (15 € für das laufende Kalenderjahr) muss auf dem Vereinskonto eingegangen sein.",
              "Erst wenn der Beitrag verbucht/bestätigt ist: Antrag freigeben. Die Person bekommt eine Mitgliedsnummer und die Einladung, den App-Zugang einzurichten.",
            ],
          },
          {
            type: "note",
            text: "Freigabe erst nach Zahlungseingang — so startet die Mitgliedschaft erst, wenn der Beitrag da ist.",
          },
          {
            type: "link",
            href: "/admin/members",
            label: "Mitglieder & Anträge",
          },
          {
            type: "link",
            href: "/admin/payments",
            label: "Zahlungen prüfen",
          },
          {
            type: "link",
            href: "/admin/membership-form",
            label: "Antrags-Link zum Teilen",
          },
        ],
      },
      {
        id: "beitraege",
        number: "2.2",
        title: "Mitgliedsbeiträge erinnern",
        summary: "Offene Beträge und App-Zugang",
        blocks: [
          {
            type: "p",
            text: "Der Beitrag gilt für ein Kalenderjahr (1. Januar bis 31. Dezember), auch bei Beitritt mitten im Jahr. Ab dem nächsten 1. Januar ist das neue Jahr wieder fällig.",
          },
          {
            type: "ol",
            items: [
              "Mitglied in der Liste öffnen.",
              "Unter den Beiträgen seht ihr offene Jahre (überfällig = 14 Tage nach Fälligkeit).",
              "„Beitrags-Erinnerung senden“: Mail mit Betrag, Kontodaten und Verwendungszweck (z. B. „Beitrag 2026, Nr. 42, Max Mustermann“).",
              "Wenn das Geld da ist: unter Zahlungen die Überweisung bestätigen. Der Beitrag wird in der Mitgliederverwaltung als bezahlt geführt — er erscheint nicht im Buchhaltungs-Saldo.",
            ],
          },
          {
            type: "p",
            text: "Buchhaltung in der App:",
          },
          {
            type: "ol",
            items: [
              "Admin → Buchhaltung öffnen.",
              "Unter „Buchhaltungs-Start“ das Datum eintragen, ab dem ihr die Kasse in der App führt, und den Kontostand eures Vereinskontos an diesem Tag.",
              "Alles vor diesem Datum bucht ihr nicht einzeln nach — der Anfangsbestand ersetzt die Historie.",
              "Mitgliedsbeiträge bleiben in der App sichtbar (offen/bezahlt, Erinnerungen), fließen aber nicht in Einnahmen und Saldo der Buchhaltung ein.",
              "Weitere Einnahmen und Ausgaben (Events, Merch-Einkauf, Allgemeines) ab Startdatum normal erfassen.",
            ],
          },
          {
            type: "p",
            text: "Zahlt jemand länger nicht, könnt ihr den App-Zugang vorübergehend deaktivieren. Das Mitglied sieht einen Hinweis und kommt nicht weiter in die App, bis ihr wieder freischaltet.",
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
        number: "2.3",
        title: "Stammdaten-Änderungen freigeben",
        summary: "Adresse und Daten prüfen",
        blocks: [
          {
            type: "ol",
            items: [
              "Mitglieder können im Profil Änderungen beantragen (z. B. Adresse).",
              "Admin → „Stammdaten freigeben“ öffnen.",
              "Änderung prüfen und annehmen oder ablehnen.",
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
        number: "2.4",
        title: "Mitglieder werben",
        summary: "Einladungen und Anni-Stars",
        blocks: [
          {
            type: "p",
            text: "Mitglieder können unter „Neues Mitglied werben“ eine Einladung per E-Mail schicken.",
          },
          {
            type: "ul",
            items: [
              "Beim Versand der Einladung: 20 Anni-Stars",
              "Wenn die Person freigeschaltet wird: zusätzlich 70 Anni-Stars",
              "Übersicht: Admin → „Empfehlungen“",
            ],
          },
          {
            type: "link",
            href: "/admin/referrals",
            label: "Empfehlungen",
          },
        ],
      },
    ],
  },
  {
    id: "community",
    number: "3",
    title: "Community: Umfragen, Gewinnspiele & Fairplay",
    sections: [
      {
        id: "umfragen",
        number: "3.1",
        title: "Umfragen erstellen und steuern",
        summary: "Anlegen, Mehrfachauswahl, beenden, löschen",
        blocks: [
          {
            type: "p",
            text: "Öffnet im normalen App-Menü „Umfragen“. Als Vorstand seht ihr dort „Neue Umfrage erstellen“.",
          },
          {
            type: "ol",
            items: [
              "„Neue Umfrage erstellen“ antippen.",
              "Frage eingeben und ein Enddatum setzen (Standard: in 14 Tagen).",
              "Auswahl-Art prüfen: Standard ist Einfachauswahl. Bei Bedarf „Mehrfachauswahl möglich“ einschalten.",
              "3 bis 10 Antwortoptionen eintragen („+ Option“).",
              "„Umfrage veröffentlichen“ tippen — danach können Mitglieder abstimmen.",
            ],
          },
          {
            type: "p",
            text: "Arten der Umfrage:",
          },
          {
            type: "ul",
            items: [
              "Einfachauswahl (Standard-Vorauswahl): jedes Mitglied wählt genau eine Antwort.",
              "Mehrfachauswahl: Mitglieder dürfen mehrere Optionen ankreuzen. Beim Anlegen oder später beim Bearbeiten umschaltbar.",
            ],
          },
          {
            type: "p",
            text: "Steuern einer laufenden Umfrage (Umfrage öffnen):",
          },
          {
            type: "ul",
            items: [
              "„Vorzeitig beenden“: Abstimmung endet sofort (nach Bestätigung).",
              "Stift „Bearbeiten“: Frage, Optionen, Ende und Auswahl-Art (Einfach/Mehrfach) anpassen und speichern. Optionen mit bereits abgegebenen Stimmen könnt ihr nicht löschen.",
              "Papierkorb „Löschen“: Umfrage unwiderruflich entfernen (nach Bestätigung).",
            ],
          },
          {
            type: "note",
            text: "Eine Umfrage kann man nicht „pausieren“. Zum Stoppen der Abstimmung dient „Vorzeitig beenden“.",
          },
          {
            type: "link",
            href: "/polls",
            label: "Zu den Umfragen",
          },
        ],
      },
      {
        id: "gewinnspiele",
        number: "3.2",
        title: "Gewinnspiele erstellen und steuern",
        summary: "Arten, pausieren, beenden, auslosen",
        blocks: [
          {
            type: "p",
            text: "Öffnet im Menü „Gewinnspiele“. Als Vorstand seht ihr oben einen Filter („Laufend“ / „Beendet / Ausgelost“) und den Button „Neues Gewinnspiel erstellen“ — ähnlich wie bei Umfragen.",
          },
          {
            type: "ol",
            items: [
              "„Neues Gewinnspiel erstellen“ antippen.",
              "Titel, Beschreibung und Ende (Datum & Uhrzeit) eintragen.",
              "Teilnahme-Modus wählen (siehe unten) und mindestens einen Preis hinzufügen.",
              "„Gewinnspiel veröffentlichen“ tippen.",
            ],
          },
          {
            type: "p",
            text: "Welche Teilnahme-Arten gibt es?",
          },
          {
            type: "ul",
            items: [
              "„Einfach teilnehmen“: ein Tippen auf „Jetzt teilnehmen“ reicht — alle Teilnehmenden sind auslosungsberechtigt.",
              "„Eine Frage“: eine Multiple-Choice-Frage mit markierter korrekter Antwort (Hinweis: „Ausgewählte Option = korrekte Antwort“). Nach korrekter Beantwortung ist die Person automatisch teilnahmeberechtigt.",
              "„Quiz (mind. 3 Fragen)“: mehrere Fragen mit je drei Antworten. Beim Anlegen markiert ihr pro Frage die korrekte Antwort (Hinweis: „Ausgewählte Option = korrekte Antwort“). Nur wer alle Fragen richtig beantwortet, kommt in die Auslosung.",
            ],
          },
          {
            type: "p",
            text: "Steuern (beim geöffneten Gewinnspiel):",
          },
          {
            type: "ul",
            items: [
              "„Pausieren“ / „Fortsetzen“: Während der Pause kann niemand neu teilnehmen. Das Gewinnspiel läuft weiter, wenn ihr fortsetzt.",
              "„Vorzeitig beenden“: Teilnahme ist danach nicht mehr möglich (nach Bestätigung). Status wird „Beendet“.",
              "„Bearbeiten“: Titel, Text, Ende, Preise und Quiz-Texte anpassen. Wenn schon Teilnahmen existieren, bleibt die richtige Quiz-Antwort gesperrt.",
              "„Gewinnspiel löschen“: nur möglich, wenn es beendet oder ausgelost ist (nicht bei der Jahresendverlosung).",
            ],
          },
          {
            type: "p",
            text: "Auslosung:",
          },
          {
            type: "ol",
            items: [
              "Das Gewinnspiel muss beendet sein (Enddatum erreicht oder vorzeitig beendet).",
              "Button „Jetzt Gewinner ermitteln“ tippen.",
              "Pro Preis wird zufällig eine berechtigte Person gezogen; niemand gewinnt denselben Lauf mehrfach.",
              "Danach ist der Status „Ausgelost“ — Gewinner können per E-Mail benachrichtigt werden.",
            ],
          },
          {
            type: "link",
            href: "/giveaways",
            label: "Zu den Gewinnspielen",
          },
        ],
      },
      {
        id: "jahresend",
        number: "3.3",
        title: "Jahresend-Sonderverlosung",
        summary: "Top 10 der Anni-Stars, Preise, Auslosung",
        blocks: [
          {
            type: "p",
            text: "Die zehn Mitglieder mit den meisten Anni-Stars am Jahresende qualifizieren sich automatisch für die Sonderverlosung — niemand meldet sich selbst an.",
          },
          {
            type: "ol",
            items: [
              "Unter „Gewinnspiele“ erscheint bei Bedarf der Hinweis „Jahresverlosung anlegen“ — antippen und bestätigen.",
              "Es entsteht die Sonderverlosung (z. B. „Sonderverlosung Top-10 Statuspunkte 2026“) mit den Top 10.",
              "Preise hinzufügen oder anpassen.",
              "Optional Signatur für die Gewinner-Mails wählen.",
              "„Bestätigen & auslosen“ tippen — die Auslosung läuft und alle Gewinner bekommen eine E-Mail.",
            ],
          },
          {
            type: "ul",
            items: [
              "Bei Gleichstand entscheiden feste Kriterien: mehr Aktivitäten im Jahr, dann früherer Beitritt, dann Nachname alphabetisch.",
              "Pausieren und vorzeitiges Beenden sind bei der Jahresendverlosung nicht vorgesehen.",
            ],
          },
          {
            type: "link",
            href: "/giveaways",
            label: "Gewinnspiele / Jahresverlosung",
          },
        ],
      },
      {
        id: "verwarnungen",
        number: "3.4",
        title: "Verwarnungen aussprechen und zurücknehmen",
        summary: "Fairplay in Beiträgen und Chat",
        blocks: [
          {
            type: "p",
            text: "Verwarnungen gibt es bei Kommentaren und Chat-Nachrichten (Feed, Umfragen, Gewinnspiele, Gruppenchat).",
          },
          {
            type: "ol",
            items: [
              "Am Kommentar bzw. an der Nachricht das Symbol „Verwarnung aussprechen“ tippen.",
              "Erste Nachfrage bestätigen: Verwarnung und automatische E-Mail an das Mitglied.",
              "Zweite Nachfrage: Soll der Kommentar/die Nachricht zusätzlich gelöscht werden? Bestätigen = löschen + verwarnen, Abbrechen = nur verwarnen (Inhalt bleibt).",
              "Ab der dritten Verwarnung erscheint ein zusätzlicher Hinweis.",
            ],
          },
          {
            type: "p",
            text: "Was das Mitglied merkt: Hinweis in der App („Du hast eine Verwarnung erhalten“), E-Mail und Eintrag unter den eigenen Verwarnungen mit Zitat und Link zu den Fanclub-Regeln.",
          },
          {
            type: "ol",
            items: [
              "Zurücknehmen: Admin → Mitglied öffnen → Karte „Verwarnungen“ → „Zurücknehmen“ (nach Bestätigung).",
              "Der Zähler sinkt; das Mitglied sieht „Verwarnung zurückgenommen“. Die Historie bleibt nachvollziehbar.",
            ],
          },
          {
            type: "link",
            href: "/admin/members",
            label: "Mitglieder (Verwarnungen zurücknehmen)",
          },
        ],
      },
      {
        id: "beitraege-freigeben",
        number: "3.5",
        title: "Mitglieder-Beiträge freigeben",
        summary: "Posts sichtbar machen oder ablehnen",
        blocks: [
          {
            type: "p",
            text: "Reicht ein Mitglied einen Beitrag ein, werdet ihr als Vorstand benachrichtigt: per Benachrichtigung in der App (antippen öffnet die Freigabe) und zusätzlich per E-Mail.",
          },
          {
            type: "ol",
            items: [
              "Admin → „Beiträge freigeben“ öffnen (oder den Link in der Benachrichtigung/E-Mail).",
              "Eingereichten Beitrag prüfen.",
              "Annehmen (erscheint im Feed) oder ablehnen — das Mitglied wird in der App über das Ergebnis informiert.",
            ],
          },
          {
            type: "link",
            href: "/admin/posts",
            label: "Beiträge freigeben",
          },
        ],
      },
    ],
  },
  {
    id: "termine",
    number: "4",
    title: "Termine & Reiseinfos",
    sections: [
      {
        id: "treffen",
        number: "4.1",
        title: "Fanclub-Treffen anlegen",
        summary: "Treffen, Ort, Kosten und Anreise",
        blocks: [
          {
            type: "ol",
            items: [
              "Im App-Menü „Treffen“ öffnen.",
              "Als Vorstand: neues Treffen anlegen — Titel, Zeit, Ort, ggf. Kosten.",
              "Im gleichen Formular den Block „Anreise & Unterkunft“ ausfüllen (siehe unten).",
              "Speichern. Mitglieder melden sich in der App an — im Profil erscheint das unter „Hier bin ich dabei“.",
            ],
          },
          {
            type: "p",
            text: "Anreise & Unterkunft (gehört zum Treffen dazu):",
          },
          {
            type: "ul",
            items: [
              "Bahnhof / Anreise und Adresse",
              "Hotel-Empfehlung und Hotel-Adresse",
              "Weitere Hinweise (freier Text)",
            ],
          },
          {
            type: "p",
            text: "Mitglieder sehen das auf der Treffen-Seite unter „Anreise & Unterkunft“.",
          },
          {
            type: "link",
            href: "/treffen",
            label: "Zu den Fanclub-Treffen",
          },
        ],
      },
      {
        id: "reiseinfos-events",
        number: "4.2",
        title: "Reiseinfos zu Konzerten ergänzen",
        summary: "Bahnhof und Hotels für Mitglieder",
        blocks: [
          {
            type: "p",
            text: "Bei Konzerten (nicht bei TV-Terminen) könnt ihr Anreise-Hinweise hinterlegen. Mitglieder sehen sie direkt am Termin.",
          },
          {
            type: "ol",
            items: [
              "Unter „Events“ den gewünschten Konzert-Termin finden.",
              "„Reiseinfos +“ bzw. „Reiseinfos“ antippen.",
              "Nächsten Bahnhof eintragen (Name und exakte Adresse mit Straße, Hausnummer, PLZ und Ort).",
              "Bis zu drei Hotels mit Name und vollständiger Adresse ergänzen („+ Hotel“).",
              "„Speichern“ tippen. Zum Entfernen aller Angaben: „Löschen“.",
            ],
          },
          {
            type: "ul",
            items: [
              "Für die Fußweg-Berechnung von der Event-Location zum Bahnhof/Hotel braucht die App die exakte und korrekte Adresse (Straße, Hausnummer, PLZ und Ort) — sonst kann die Entfernung nicht zuverlässig berechnet werden.",
              "Mitglieder sehen Bahnhof und Hotels; wenn möglich, wird die Fußweg-Entfernung angezeigt.",
              "Öffentliche Konzert-/TV-Termine kommen oft automatisch — wenn etwas fehlt: Admin → System → „Event Synchronisation“.",
            ],
          },
          {
            type: "link",
            href: "/events",
            label: "Zu den Events",
          },
          {
            type: "link",
            href: "/admin/events-sync",
            label: "Event Synchronisation",
          },
        ],
      },
    ],
  },
  {
    id: "emails",
    number: "5",
    title: "E-Mails",
    sections: [
      {
        id: "email-alltag",
        number: "5.1",
        title: "Vorlagen, Signatur und Versand prüfen",
        summary: "Mails ohne jedes Mal neu tippen",
        blocks: [
          {
            type: "p",
            text: "E-Mail-Konten (SMTP) einrichten und pflegen:",
          },
          {
            type: "ol",
            items: [
              "Admin → System → „Email Konten verwalten“ öffnen.",
              "„Neues Konto“: Host (SMTP-Server), Port, Verschlüsselung (SSL/TLS/STARTTLS), E-Mail/Login, Passwort, optional Anzeigename und Antwortadresse. Haken „Standard-Konto“, wenn dieses Konto für den Versand genutzt werden soll.",
              "Speichern. Danach „Test“ (Verbindung) oder „Test-Mail“ (Probeschreiben an euch).",
              "Bestehendes Konto: „Bearbeiten“ — Daten ändern; Passwort leer lassen, wenn es unverändert bleiben soll. „Als Standard“ setzen, wenn nötig.",
              "Löschen: nur möglich, wenn noch mindestens ein anderes Konto bleibt (nach Bestätigung).",
            ],
          },
          {
            type: "ol",
            items: [
              "„E-Mail-Vorlagen“: Betreff und Text anpassen. Anrede und Unterschrift werden automatisch eingesetzt.",
              "„Signaturen“: gemeinsame Fanclub-Unterschrift pflegen.",
              "„E-Mail-Historie“: nachschauen, ob eine Mail rausgegangen ist — und bei Bedarf erneut senden.",
            ],
          },
          {
            type: "note",
            text: "Zurzeit gehen Test-Mails nur an die Vorstände und die offizielle App-Adresse. So landet versehentlich nichts bei der ganzen Mitgliedschaft. Wenn ihr an alle schreiben wollt, sagt Bescheid — dann wird der Versand freigeschaltet.",
          },
          {
            type: "link",
            href: "/admin/settings/email",
            label: "Email Konten",
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
    ],
  },
  {
    id: "sterne-statistik",
    number: "6",
    title: "Anni-Stars & Statistik",
    sections: [
      {
        id: "anni-stars",
        number: "6.1",
        title: "Anni-Stars und Badges",
        summary: "Was Mitglieder sammeln",
        blocks: [
          {
            type: "ul",
            items: [
              "Anni-Stars belohnen Mitmachen (Umfragen, Kommentare, Events, Werben, …) und zählen für das laufende Kalenderjahr — am 1. Januar geht es wieder bei null los.",
              "Ränge zeigen den Stand im Jahr: Fan → Aktiv-Fan (100) → Treue-Fan (250) → Silber-Fan (500) → Gold-Fan (1 000) → Diamond-Fan (2 500).",
              "Badges (z. B. Konzertprofi) können auch wieder sinken — z. B. wenn jemand Likes entfernt, Event-Teilnahmen zurücknimmt oder Kommentare löscht. Die Stufe passt sich automatisch an den aktuellen Stand an.",
              "Für eigene Beiträge oder eigene Umfragen gibt es keine Sterne.",
              "Zum Jahresende: Top 10 der Jahres-Sterne → Sonderverlosung (siehe 3.3).",
            ],
          },
          {
            type: "link",
            href: "/punkte",
            label: "Punkte-Seite (Mitgliederansicht)",
          },
        ],
      },
      {
        id: "statistik",
        number: "6.2",
        title: "App-Statistik und Protokoll",
        summary: "Überblick behalten",
        blocks: [
          {
            type: "p",
            text: "App-Statistik erreichen: Admin-Bereich → System → „App-Statistik“ (oder direkt den Link unten).",
          },
          {
            type: "p",
            text: "Oben seht ihr Kennzahlen auf einen Blick:",
          },
          {
            type: "ul",
            items: [
              "Aktive Mitglieder (Status aktiv gesamt)",
              "In der App registriert (und Anteil an den Aktiven)",
              "Aktiv diese Woche / diesen Monat (verschiedene Personen)",
              "Aktiv gestern",
              "Noch nie in der App (aktive Mitglieder ohne Login)",
              "Beiträge diesen Monat und Chat-Nachrichten im Gruppenchat",
            ],
          },
          {
            type: "p",
            text: "Darunter wählt ihr unter „Anzeige“, welche Statistik als Diagramm gezeigt wird:",
          },
          {
            type: "ul",
            items: [
              "Aktive Mitglieder / Tag — wie viele verschiedene Personen die App an dem Tag genutzt haben (Monat per Pfeile wechseln).",
              "App-Öffnungen / Tag — wie oft die App genutzt wurde (auch mehrmals von derselben Person).",
              "Monatsvergleich — aktive Mitglieder je Monat (12 Monate).",
              "Gesamtmitglieder — Mitgliederstand zum jeweiligen Monatsende (12 Monate).",
            ],
          },
          {
            type: "p",
            text: "Zusätzlich: Admin → „Protokoll“ zeigt, wer im Admin-Bereich wann wichtige Änderungen gemacht hat (Audit-Log).",
          },
          {
            type: "link",
            href: "/admin/app-stats",
            label: "App-Statistik",
          },
          {
            type: "link",
            href: "/admin/audit",
            label: "Protokoll",
          },
        ],
      },
    ],
  },
  {
    id: "system",
    number: "7",
    title: "System & Einstellungen",
    sections: [
      {
        id: "gruppenchat",
        number: "7.1",
        title: "Gruppenchat moderieren",
        summary: "Nachrichten löschen und verwarnen",
        blocks: [
          {
            type: "p",
            text: "Im Gruppenchat können Vorstände einzelne Nachrichten löschen und bei Verstößen Verwarnungen aussprechen — das funktioniert genauso wie bei Kommentaren (siehe 3.4).",
          },
          {
            type: "ul",
            items: [
              "Nachricht antippen \u2192 \u201EVerwarnung aussprechen\u201C oder \u201EL\u00F6schen\u201C.",
              "Verwarnungen werden gezählt und das Mitglied per E-Mail informiert.",
            ],
          },
        ],
      },
      {
        id: "club-info",
        number: "7.2",
        title: "Club-Info und Bankdaten pflegen",
        summary: "Vereinsinfos für Mitglieder und Zahlungen",
        blocks: [
          {
            type: "p",
            text: "Unter Admin \u2192 System \u2192 \u201EClub-Info\u201C pflegt ihr die Vereinsdaten: Name, Anschrift, Bankverbindung (IBAN, BIC, Kontoinhaber). Diese Daten erscheinen auf dem Beitragsformular und in Zahlungserinnerungen.",
          },
          {
            type: "link",
            href: "/admin",
            label: "Admin-Übersicht → System",
          },
        ],
      },
      {
        id: "club-regeln",
        number: "7.3",
        title: "Fanclub-Regeln verwalten",
        summary: "Regeln bearbeiten, die Mitglieder akzeptieren",
        blocks: [
          {
            type: "p",
            text: "Unter Admin \u2192 System \u2192 \u201EFanclub-Regeln\u201C k\u00F6nnt ihr die Community-Regeln bearbeiten. Neue Mitglieder m\u00FCssen die Regeln beim ersten Login akzeptieren. Bei \u00C4nderungen werden bestehende Mitglieder aufgefordert, erneut zuzustimmen.",
          },
        ],
      },
      {
        id: "geburtstags-posts",
        number: "7.4",
        title: "Geburtstags-Beiträge",
        summary: "Automatische Beiträge an Geburtstagen",
        blocks: [
          {
            type: "p",
            text: "Die App erstellt automatisch einen Geburtstags-Beitrag im Feed, wenn ein Mitglied Geburtstag hat. Unter Admin \u2192 \u201EGeburtstags-Beitr\u00E4ge\u201C k\u00F6nnt ihr die Vorlage (Text und Bild) anpassen.",
          },
          {
            type: "link",
            href: "/admin/birthday-posts",
            label: "Geburtstags-Beiträge",
          },
        ],
      },
      {
        id: "merchandise",
        number: "7.5",
        title: "Merchandise (Fanshop)",
        summary: "Produkte verwalten — noch nicht aktiv",
        blocks: [
          {
            type: "p",
            text: "Im Fanshop können Produkte angelegt und verwaltet werden. Bestellungen und Bezahlung laufen derzeit nicht über die App — Mitglieder sehen nur den Katalog.",
          },
          {
            type: "note",
            text: "Der Fanshop ist vorbereitet, aber noch nicht vollständig aktiv in der App. Sobald er freigeschaltet wird, ergänzen wir diese Anleitung.",
          },
          {
            type: "link",
            href: "/admin/merchandise",
            label: "Merchandise verwalten",
          },
        ],
      },
    ],
  },
];

/** Flache Liste aller Abschnitte (für Anker und Rendering). */
export function flattenHandbookSections(): AdminHandbookSection[] {
  return ADMIN_HANDBOOK_CHAPTERS.flatMap((chapter) => chapter.sections);
}
