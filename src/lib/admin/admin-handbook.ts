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

export const ADMIN_HANDBOOK_UPDATED = "2026-08-16";

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
            text: "Wichtig: Umfragen und Gewinnspiele liegen nicht im Admin-Hub, sondern in den normalen Menüpunkten „Umfragen“ und „Gewinnspiele“. Fanclub-Treffen legt ihr unter „Mitglieder“ → Tab „Fanclub Treffen“ an — ebenfalls nicht im Admin-Hub.",
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
              "an Live-Sessions mit Anni teilnehmen (zuschauen, chatten, Fragen stellen)",
              "an Umfragen und Gewinnspielen teilnehmen",
              "Konzerte und Fanclub-Treffen sehen und „Ich bin dabei“ markieren",
              "Mitglieder suchen, auf der regionalen Mitglieder-Karte finden und Profile anschauen",
              "Anni-Stars sammeln und Badges freischalten",
              "sich digital als Mitglied anmelden und den Beitrag überweisen",
              "andere zum Fanclub einladen, erinnern und den Status der Einladung verfolgen",
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
              "Mit dem Antrag wird automatisch eine offene Zahlung per Banküberweisung angelegt. Der Beitrag (15 € für das laufende Kalenderjahr) muss auf dem Vereinskonto eingegangen sein. Antragsteller/innen sehen als Verwendungszweck „Mitgliedsbeitrag / Vorname Nachname“ (z. B. Mitgliedsbeitrag / Franz Müller). Intern bleibt zusätzlich die Buchungsnummer MITGLIED-… für den Abgleich.",
              "Die Bestätigungs-E-Mail enthält Betrag, Empfänger, IBAN, BIC und denselben namensbasierten Verwendungszweck zum Abtippen.",
              "Erst wenn der Beitrag unter Admin → Zahlungen als bezahlt bestätigt ist, lässt sich der Antrag freigeben. Die Freigabe ist technisch gesperrt, solange die Zahlung offen ist. Danach erhält die Person automatisch eine Mitgliedsnummer und eine Willkommens-E-Mail mit App-Zugang (Passwort einrichten).",
              "Fehlt bei einem bestehenden Mitglied die Login-E-Mail (z. B. nach Import): Mitglied öffnen → „Bearbeiten“ → bei E-Mail „Ändern“ (mit Bestätigung) → Adresse eintragen und speichern. Die Adresse muss eindeutig sein und ist zugleich der Login.",
              "Wird eine bereits vorhandene Login-E-Mail später geändert, erhält das Mitglied automatisch eine Info-Mail an die neue und die bisherige Adresse: neue Login-Adresse, Passwort bleibt gleich.",
              "Jemand kommt ohne digitalen Antrag (z. B. per Zettel, Mail oder WhatsApp): unter Mitglieder „+ Person manuell anlegen“. Beitrittsdatum leer lassen und Status „Mitgliedschaft beantragt“ — die Person ist dann noch kein Mitglied. Nach dem Speichern öffnet sich die Mail „Antrag eingegangen / bitte zahlen“ (Betreff und Text editierbar, Versand optional). Inhalt: Antragseingang, Betrag, IBAN und Verwendungszweck „Mitgliedsbeitrag / Vorname Nachname“ — derselbe wie beim Online-Antrag. Kein App-Zugangslink in dieser Mail. Unter Zahlungen erscheint eine offene Überweisung. Erst wenn das Geld da ist: Datensatz öffnen → Bearbeiten → Beitrittsdatum eintragen und Status auf „aktiv“. Dann gibt es Mitgliedsnummer und Willkommens-Mail mit App-Zugang.",
            ],
          },
          {
            type: "note",
            text: "Freigabe erst nach Zahlungseingang — die App lässt die Freigabe nicht zu, solange die Beitragszahlung nicht bestätigt ist.",
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
              "Mitglied oder offenen Antrag in der Liste öffnen (auch ohne Beitrittsdatum, Status „Mitgliedschaft beantragt“).",
              "Unter den Beiträgen seht ihr offene Jahre (überfällig = 14 Tage nach Fälligkeit).",
              "„Zahlungserinnerung senden“ (bei bestehenden Mitgliedern) bzw. „Zahlungsinfo senden“ (bei Status „Mitgliedschaft beantragt“): Mail mit Betrag, Kontodaten und Verwendungszweck „Mitgliedsbeitrag / Vorname Nachname“ (z. B. Mitgliedsbeitrag / Max Mustermann). Bei Papier-/Manuell-Anträgen lautet die Vorlage „Antrag eingegangen“ plus Zahlungsaufforderung — Betreff und Text sind vor dem Versand editierbar; Schließen ohne Senden ist möglich. Die interne Buchungsnummer MITGLIED-… ist nur für den Abgleich unter Zahlungen gedacht und steht nicht als Verwendungszweck in der Mail.",
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
        id: "versteckte-konten",
        number: "2.4",
        title: "Versteckte Konten",
        summary: "Nicht im Mitglieder-Bereich sichtbar",
        blocks: [
          {
            type: "p",
            text: "Technische Vorstands-Konten können für die Mitglieder-App unsichtbar sein („Geist“). Sie erscheinen nicht im Verzeichnis, in der Suche, auf der Karte, in Avatar-Listen, in der Anni-Stars-Rangliste, in der Online-Liste im Chat oder als Geburtstags-Beitrag und sammeln keine Sterne/Badges. Wenn der Geist selbst kommentiert oder schreibt, kann der Name sichtbar sein — aber ohne klickbaren Profil-Link. Die Direkt-URL zum Mitglieder-Portal liefert für alle anderen (auch Vorstand) eine 404; nur der eigene Account kann die Seite sehen. Unter Admin → Mitglieder & Anträge bleiben die Konten für den Vorstand sichtbar; Login und alle Admin-Funktionen funktionieren weiter.",
          },
        ],
      },
      {
        id: "app-registrierung",
        number: "2.5",
        title: "In App registriert",
        summary: "Offen, Registriert oder Gelöscht",
        blocks: [
          {
            type: "p",
            text: "In der Mitgliederliste und auf der Mitglieds-Detailseite seht ihr unter „In App registriert“, ob jemand den App-Zugang schon eingerichtet hat:",
          },
          {
            type: "ul",
            items: [
              "Offen — Passwort noch nicht eingerichtet bzw. noch nie angemeldet",
              "Registriert — Zugang eingerichtet (nach Passwort-Setup oder erstem Login)",
              "Gelöscht — Zugang wurde als gelöscht markiert (z. B. wenn jemand den Zugang nicht mehr nutzen soll)",
            ],
          },
          {
            type: "p",
            text: "Auf der Detailseite könnt ihr den Status manuell auf „Gelöscht“ setzen oder wieder auf „Offen“ zurücksetzen (z. B. vor einer neuen Einladungs-Mail). Das ist unabhängig von einer vorübergehenden App-Sperre wegen Beitragsrückstand.",
          },
          {
            type: "p",
            text: "Wenn ein bereits registriertes Mitglied „Passwort vergessen“ nutzt, geht nur der Passwort-Reset — nicht die komplette Ersteinrichtung. Alte Einrichtungs-Links leiten registrierte Personen ebenfalls auf den Passwort-Reset um. Bei Status „Offen“ (noch nie eingerichtet) bleibt der Einrichtungs-Flow inkl. Geburtsdatum.",
          },
          {
            type: "note",
            text: "Die Erkennung „schon in der App“ nutzt mehrere Hinweise (Status, Registrierungsdatum, letzte App-Aktivität, letzter Login). Deshalb landet z. B. Janine nach „Passwort vergessen“ nur beim neuen Passwort — ohne Geburtsdatum und ohne erneute Registrierung.",
          },
          {
            type: "link",
            href: "/admin/members",
            label: "Mitglieder & Anträge",
          },
        ],
      },
      {
        id: "empfehlungen",
        number: "2.6",
        title: "Mitglieder werben",
        summary: "Einladungen und Anni-Stars",
        blocks: [
          {
            type: "p",
            text: "Mitglieder können unter „Neues Mitglied einladen“ eine Einladung per E-Mail schicken. Diese Werbe-Mails gehen auch im E-Mail-Testmodus raus (Empfänger sind noch keine Mitglieder). Andere Mitglieder-Mails bleiben im Testmodus auf die Freigabeliste beschränkt.",
          },
          {
            type: "ul",
            items: [
              "Beim Versand der Einladung: 5 Anni-Stars (einmal pro Empfänger-Adresse)",
              "Max. 3 Einladungen pro Tag und 10 pro Woche; dieselbe E-Mail erst nach 14 Tagen erneut",
              "Wenn die Person freigeschaltet wird: zusätzlich 70 Anni-Stars",
              "Mitglieder sehen ihre Einladungen (E-Mail, Name, Zeitpunkt) und können nach 7 Tagen erinnern — danach alle 14 Tage erneut",
              "Auffällige Einladungs-Muster landen still zur Prüfung unter Empfehlungen: Sterne werden gehalten, weitere Einladungen des Mitglieds sind bis zur Entscheidung pausiert — freigeben oder zurücknehmen",
              "Übersicht für Vorstände: Admin → „Empfehlungen“",
            ],
          },
          {
            type: "link",
            href: "/admin/referrals",
            label: "Empfehlungen",
          },
        ],
      },
      {
        id: "mitglieder-karte",
        number: "2.7",
        title: "Mitglieder-Karte (Datenschutz)",
        summary: "Nur Regionen, keine Wohnadressen",
        blocks: [
          {
            type: "p",
            text: "Unter „Mitglieder“ → Tab „Mitglieder-Karte“ seht ihr, aus welchen Gegenden die Community kommt. Die Karte ist bewusst grob:",
          },
          {
            type: "ul",
            items: [
              "Keine Straßen, Hausnummern oder exakten Wohnorte",
              "Jeder Standort wird der nächsten größeren Stadt im gleichen Land zugeordnet (ca. ab 60–70.000 Einwohnern, z. B. „Raum Erfurt“ oder „Raum Almelo“)",
              "Mitglieder im Ausland kommen nie in eine deutsche Region — und umgekehrt",
              "Mehrere Mitglieder derselben Region erscheinen als ein Sammelpunkt mit Anzahl",
              "Zoom ist begrenzt — die Karte zeigt Herkunftsregionen, nicht Einzeladressen",
            ],
          },
          {
            type: "note",
            text: "Adresse und PLZ bleiben intern in den Stammdaten für Verwaltung und Post. Auf der Karte werden sie nicht 1:1 angezeigt. Wenn jemand sich wegen der Karte unsicher fühlt: so erklären — Wohnort erscheint nur als Region im eigenen Land.",
          },
          {
            type: "link",
            href: "/mitglieder?tab=karte",
            label: "Mitglieder-Karte öffnen",
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
              "Button „Jetzt Gewinner ermitteln“ tippen — die App zieht zufällig je eine berechtigte Person pro Preis; niemand gewinnt denselben Lauf mehrfach.",
              "Danach ist der Status „Ausgelost“ — Gewinner können per E-Mail benachrichtigt werden.",
              "Ein beendetes Gewinnspiel kann nicht wieder geöffnet werden (sonst ändert sich der Teilnehmerkreis). Bei Bedarf neu anlegen.",
              "Doppelklick oder zwei Tabs: Die Auslosung läuft nur einmal; ein zweiter Versuch meldet „bereits ermittelt“.",
            ],
          },
          {
            type: "note",
            text: "Die Auslosung wird im Admin-Protokoll vermerkt. Cron legt die Jahresverlosung nur an — ausgelost wird immer manuell vom Vorstand.",
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
              "Eingereichten Beitrag prüfen — Bilder werden vollständig (ohne Zuschnitt) angezeigt; Antippen vergrößert sie.",
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
      {
        id: "live-anni",
        number: "3.6",
        title: "Live mit Anni",
        summary: "Video-Session, Einladung, Zusage und Fragen",
        blocks: [
          {
            type: "p",
            text: "Ihr könnt Termine anlegen, bei denen Anni per Browser live zu sehen ist (Kamera und Mikrofon freigeben — keine Extra-App). Mitglieder schauen zu, schreiben im Session-Chat und können Fragen stellen.",
          },
          {
            type: "ol",
            items: [
              "Admin → Community → „Live mit Anni“ öffnen.",
              "Titel, Beitritt ab (z. B. 10 Minuten vor Start), Start und Dauer in Minuten eintragen (höchstens 60). Nach der Dauer endet Annis Video automatisch.",
              "Haken „Einladen“ lassen — alle Fanclub-Mitglieder und Anni werden per E-Mail und App-Benachrichtigung informiert und eingeladen. Bei Zusage gibt es am Tag zuvor eine Erinnerung.",
              "„Live-Chat erstellen“ tippen. Den Host-Link einmalig kopieren und Anni rechtzeitig schicken. Wenn die Verbindung abbricht, denselben Link erneut öffnen.",
              "Mitglieder öffnen den Link nach Login: zuerst Infoseite (Wann, Ablauf, Zusage/Absage mit sichtbarer Teilnehmerliste, optional eine Vorab-Frage). Video und Chat erscheinen erst, wenn das Beitrittsfenster offen ist (am Live-Tag).",
              "Zur Startzeit: Anni öffnet den Host-Link und gibt Kamera/Mikro frei. Bis sie online ist, sehen Mitglieder den Hinweis, dass der Fan-Chat gleich beginnt. Vorzeitig beenden: Button „Live beenden“ (Verabschiedung).",
              "Wenn Anni fertig ist (Zeit abgelaufen oder „Live beenden“): Video aus. Der Chat bleibt noch 10 Minuten offen — Countdown „Live-Chat Session endet in …“. Danach schließt sich die Session sofort und unter Live steht wieder „kein Termin“.",
            ],
          },
          {
            type: "note",
            text: "Wer den Live-Raum öffnet und länger als eine Minute dabei ist, erhält einmalig +2 Anni-Stars. Pro Mitglied nur eine Vorab-Frage (danach Hinweis: weitere Fragen im Live-Chat). Während des Live weiterhin max. eine offene Frage. Zugang nur nach Login als aktives Mitglied. Bis zum Go-Live: Annis Live-Mails an die Testadresse — siehe 7.5.",
          },
          {
            type: "link",
            href: "/admin/live",
            label: "Live mit Anni (Admin)",
          },
          {
            type: "link",
            href: "/admin/settings/email-templates",
            label: "E-Mail-Vorlagen",
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
        summary: "Unter Mitglieder → Fanclub Treffen",
        blocks: [
          {
            type: "p",
            text: "Treffen verwaltet ihr nicht im Admin-Hub, sondern im normalen Mitglieder-Bereich:",
          },
          {
            type: "ol",
            items: [
              "Im Menü „Mitglieder“ öffnen.",
              "Oben den Tab „Fanclub Treffen“ wählen.",
              "Als Vorstand erscheint dort das Formular „Neues Treffen anlegen“ — Titel, Zeit, Ort, ggf. Kosten und Anreise ausfüllen.",
              "Speichern. Mitglieder sehen den Termin in demselben Tab und können teilnehmen — im Profil erscheint das unter „Hier bin ich dabei“.",
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
            text: "Mitglieder sehen das auf der Treffen-Seite unter „Anreise & Unterkunft“. Vergangene Treffen findet ihr im Tab „Treffen-Archiv“.",
          },
          {
            type: "link",
            href: "/mitglieder?tab=treffen",
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
            type: "note",
            text: "Hinweis Go-Live: Reiseinformationen sind vorübergehend für alle ausgeblendet (Funktion bleibt im System). Später wieder sichtbar.",
          },
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
              "„E-Mail-Vorlagen“: Betreff und Text anpassen. Anrede und Unterschrift werden automatisch eingesetzt. Dort findet ihr auch den Reiter „Geburtstags-Beiträge“ (siehe 7.4) sowie die Vorlagen für Mitglieder-Einladungen und Erinnerungen.",
              "„Signaturen“: gemeinsame Fanclub-Unterschrift pflegen.",
              "„E-Mail-Historie“: nachschauen, ob eine Mail rausgegangen ist — und bei Bedarf erneut senden.",
              "„Mitglieder-Benachrichtigungen“ (System): optionale Massen-Mails an alle aktiven Mitglieder bei neuem Gewinnspiel, neuem Auftritt/Event oder neuer Umfrage — jeweils einzeln einschaltbar.",
              "Aktuell ist in der Regel nur „Neuer Auftritt / Event“ eingeschaltet; Gewinnspiel und Umfrage bleiben aus, bis ihr sie bewusst aktiviert.",
              "Mitglieder können unter „Mein Profil → E-Mail-Benachrichtigungen“ einzelne optionale Mails abschalten (Events, Gewinnspiele, Umfragen, Treffen-Erinnerungen, Live mit Anni, App-Erinnerungen). Wer abgeschaltet hat, bekommt diese Mails nicht — auch wenn die Club-Einstellung an ist.",
              "Automatische App-Erinnerungen: Wer die App noch nie genutzt hat, erhält bis zu 4 Mails im Abstand von 7 Tagen. Wer einen Monat nicht aktiv war, erhält einmalig eine freundliche Rückkehr-Mail — sofern das Mitglied App-Erinnerungen nicht abgeschaltet hat.",
              "Willkommen-Flow für neue Mitglieder: Beim ersten Login nach Freigabe erscheinen Fanclub-Regeln und optional Kennenlernen. Währenddessen sind Menü, Chat und Kopfzeile ausgeblendet — erst nach Abschluss geht es in die App.",
            ],
          },
          {
            type: "note",
            text: "Die optionalen Massen-Mails (Gewinnspiel / Event / Umfrage) sind standardmäßig aus und müssen unter „Mitglieder-Benachrichtigungen“ einzeln freigeschaltet werden. In-App-Benachrichtigungen (Glocke oben) laufen unabhängig davon weiter. Nicht abschaltbar für Mitglieder: Verwarnungen, Beitrags-/Zahlungserinnerungen, Zugangs-/Freigabe-Mails und Sicherheitsmeldungen (z. B. geänderte Login-E-Mail).",
          },
          {
            type: "note",
            text: "Solange der E-Mail-Versand im Testmodus läuft (Standard vor Go-Live), gehen Massen-Mails und die meisten Mitglieder-Mails nur an die Allowlist (Vorstand/SMTP) — nicht an alle Mitglieder. Live-Versand: EMAIL_OUTBOUND_MODE=live. Wenn nach Freischaltung die Einladungs-Mail fehlschlägt, bleibt das Mitglied aktiv; die App zeigt einen Hinweis — Zugangslink unter Mitglieder erneut senden oder E-Mail-Log prüfen.",
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
            href: "/admin/settings/notifications",
            label: "Mitglieder-Benachrichtigungen",
          },
          {
            type: "link",
            href: "/admin/signatures",
            label: "Signaturen",
          },
        ],
      },
      {
        id: "zugang-passwort",
        number: "5.2",
        title: "Zugang & Passwort vergessen",
        summary: "Ersteinrichtung vs. nur neues Passwort",
        blocks: [
          {
            type: "p",
            text: "Mitglieder mit Problemen beim Anmelden sollen selbst unter Login → „Passwort vergessen“ einen neuen Link anfordern. Der Vorstand muss das nicht manuell auslösen.",
          },
          {
            type: "ul",
            items: [
              "Schon in der App registriert (Passwort eingerichtet / schon angemeldet, z. B. Janine): Es geht nur ein Passwort-Reset — kein Geburtsdatum, keine erneute Registrierung.",
              "Noch nie eingerichtet (Status „Offen“): Der Link führt zur Ersteinrichtung mit Geburtsdatum und Passwort — das ist so gewollt.",
              "Alte Setup-Links von registrierten Mitgliedern leiten automatisch auf den Passwort-Reset um.",
              "Der Link aus der Club-Mail bleibt gültig, bis das Passwort wirklich gesetzt ist (auch mehrmals und auf anderen Geräten). Jede neue Mail ersetzt den alten Link.",
              "Schlägt der Versand fehl, erscheint eine Fehlermeldung — kein stiller Erfolg. Unter „E-Mail-Historie“ könnt ihr nachschauen, ob die Mail rausgegangen ist.",
            ],
          },
          {
            type: "note",
            text: "Wenn jemand meldet, die Erfolgsmeldung käme ohne Mail: unter Admin → E-Mail-Historie prüfen. Bei echtem Versandfehler zeigt „Passwort vergessen“ einen Fehler — kein stiller Erfolg. Der E-Mail-Versand ist live; Mitglieder können jederzeit einen neuen Link anfordern.",
          },
          {
            type: "link",
            href: "/admin/settings/email-log",
            label: "E-Mail-Historie",
          },
          {
            type: "link",
            href: "/forgot-password",
            label: "Passwort vergessen (Mitglieder-Ansicht)",
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
              "Anni-Stars belohnen Mitmachen (Umfragen, Kommentare, Events, Werben, vollständiger Steckbrief, …) und zählen für das laufende Kalenderjahr — am 1. Januar geht es wieder bei null los.",
              "Einmalig 10 Anni-Stars, wenn der Steckbrief vollständig ist (Kurztext + fünf Kennenlernen-Fragen unter „Mein Profil“) — die Sterne werden automatisch gutgeschrieben, sobald alles ausgefüllt und gespeichert ist.",
              "Unvollständige Steckbriefe: Die App erinnert Mitglieder automatisch nach 7 und 14 Tagen Mitgliedschaft (danach keine weiteren Erinnerungen — der Hinweis im Profil bleibt).",
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
              "Aktive Mitglieder (Status aktiv gesamt — Vorstände zählen mit, versteckte System-Konten nicht)",
              "In der App registriert (und Anteil an den Aktiven)",
              "Aktiv diese Woche / diesen Monat (verschiedene Personen)",
              "Aktiv gestern",
              "Noch nie in der App (aktive Mitglieder ohne Login)",
              "Beiträge diesen Monat und Chat-Nachrichten im Gruppenchat",
            ],
          },
          {
            type: "note",
            text: "Vorstände (Nicole, Andreas, Janine) zählen in allen Zahlen als normale Mitglieder mit. Das versteckte Technik-Konto (Peter) erscheint in der Statistik nicht.",
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
        title: "Club-Info und Bankdaten",
        summary: "Vereinskonto für Überweisungen",
        blocks: [
          {
            type: "p",
            text: "Die Bankdaten für Mitgliedsbeiträge (Kontoinhaber, IBAN, BIC, Bankname) sind fest in der App hinterlegt und erscheinen auf dem Antragsformular sowie in Zahlungserinnerungen. Eine eigene „Club-Info“-Seite im Admin gibt es derzeit nicht — Änderungen am Konto bitte an die technische Betreuung melden.",
          },
          {
            type: "ul",
            items: [
              "Kontoinhaber: Anni-Perka Fanclub",
              "Bank: Ostseesparkasse Rostock",
              "Verwendungszweck-Hinweis: Mitgliedsbeitrag / Vorname Nachname",
            ],
          },
        ],
      },
      {
        id: "club-regeln",
        number: "7.3",
        title: "Fanclub-Regeln",
        summary: "Was Mitglieder akzeptieren",
        blocks: [
          {
            type: "p",
            text: "Die Fanclub-Regeln (WhatsApp und App) sind fest in der App hinterlegt. Neue Mitglieder müssen sie beim ersten Login akzeptieren. Eine Bearbeitung direkt im Admin-Bereich gibt es derzeit nicht — Textänderungen bitte an die technische Betreuung.",
          },
          {
            type: "link",
            href: "/regeln",
            label: "Regeln ansehen (Mitgliederansicht)",
          },
        ],
      },
      {
        id: "geburtstags-posts",
        number: "7.4",
        title: "Geburtstags-Beiträge",
        summary: "Vorlagen und automatischer Feed-Post",
        blocks: [
          {
            type: "p",
            text: "Jeden Morgen prüft die App automatisch, wer Geburtstag hat (aktive Mitglieder mit hinterlegtem Geburtsdatum). Für jede Person erscheint ein Glückwunsch-Beitrag im Feed (Dashboard) — für alle Mitglieder sichtbar und kommentierbar, mit Fanclub-Absender. Das Geburtstagskind erhält zusätzlich eine In-App-Benachrichtigung.",
          },
          {
            type: "ol",
            items: [
              "Admin → E-Mail & Kommunikation → „E-Mail-Vorlagen“ öffnen.",
              "Oben den Reiter „Geburtstags-Beiträge“ wählen (nicht die normalen System-Mails).",
              "Bestehende Vorlagen bearbeiten oder eine neue anlegen (Titel und Text).",
              "Platzhalter nutzen, z. B. {{first_name}}, {{salutation}}, {{mention}} — die Vorschau zeigt ein Beispiel.",
              "Nur aktive Vorlagen kommen zum Zug; bei mehreren aktiven wählt die App abwechselnd.",
            ],
          },
          {
            type: "note",
            text: "Geburtstags-Beiträge sind Community-Posts: alle Mitglieder sehen sie auf der Startseite und dürfen gratulieren (Kommentare/Reaktionen). Das gilt auch schon im Soft-Launch vor dem offiziellen Start. Ihr ändert nur die Textvorlagen — den täglichen Beitrag startet die App selbst, ohne manuelle Freigabe.",
          },
          {
            type: "link",
            href: "/admin/settings/email-templates?tab=birthday",
            label: "Geburtstags-Vorlagen",
          },
        ],
      },
      {
        id: "go-live",
        number: "7.5",
        title: "Go-Live Checkliste (technisch)",
        summary: "Start 16.08.2026 um 10:00 — was vorher erledigt wird",
        blocks: [
          {
            type: "p",
            text: "Offizieller Start: 16.08.2026 um 10:00 Uhr. Ab App-Zugang (ca. 13.08.) können sich Mitglieder anmelden, Profil und Foto pflegen, die Kennenlern-Fragen beantworten, im Gruppenchat schreiben und unter Geburtstags-Beiträgen im Feed gratulieren. Eigene Posts, allgemeine Kommentare, Umfragen und Gewinnspiele bleiben bis zum Start gesperrt.",
          },
          {
            type: "ol",
            items: [
              "Backup der Datenbank anlegen.",
              "Daten-Reset ausführen (SQL 134_go_live_reset.sql): Punkte, Chat, Posts, Test-Engagement leeren — Mitglieder bleiben.",
              "Einladungs-Vorlage aktualisieren (SQL 133_email_app_access_go_live.sql).",
              "E-Mail-Versand auf Live stellen (EMAIL_OUTBOUND_MODE=live).",
              "Am 13.08.: Registrierungs-Mails an alle aktiven Mitglieder senden (Skript send-app-access-all-members.ts).",
              "Reiseinformationen bleiben ausgeblendet (kommen später).",
              "Live mit Anni: Leerhinweis „kein Termin“ ist aktiv; bei Bedarf LiveKit und Anni-Mail (booking@anniperka.de) prüfen.",
              "Am 16.08. um 10:00: Soft-Launch-Sperre für eigene Posts/Umfragen/Gewinnspiele endet automatisch — kurz Posts und Kommentare testen. Geburtstagsgratulationen waren schon vorher freigeschaltet.",
            ],
          },
          {
            type: "note",
            text: "Anni wird bei jeder neuen Live-Session automatisch per E-Mail eingeladen und erhält wie die Zusagen einen Tag vorher die Erinnerung. Bis zum Live-Modus gehen Annis Live-Mails an die Testadresse.",
          },
          {
            type: "note",
            text: "Zugang & Passwort: Registrierte Mitglieder bekommen bei „Passwort vergessen“ nur den Passwort-Reset (kein Geburtsdatum). Noch offene Zugänge bekommen die Ersteinrichtung. Willkommens-/Zugangs-Mails für neue Mitglieder führen weiterhin zur Ersteinrichtung — aber nicht erneut, wenn jemand die App schon genutzt hat. Links bleiben bis zur Passwortvergabe wiederverwendbar; jede neue Mail ersetzt den alten Link. Details: Abschnitt 5.2.",
          },
          {
            type: "note",
            text: "Geburtsdatum bei der Ersteinrichtung: Es muss zum Konto in der E-Mail passen (TT.MM.JJJJ). Bei Familien auf demselben Handy/PC bitte jeweils den eigenen Link öffnen — sonst wirkt das Geburtsdatum „falsch“, obwohl es stimmt. Im Zweifel: Privates Fenster oder „Passwort vergessen“ mit der eigenen E-Mail (registrierte Mitglieder landen dann nur beim Passwort-Reset).",
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
