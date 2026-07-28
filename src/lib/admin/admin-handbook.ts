/**
 * Admin-Handbuch (nur für Vorstände / role=admin).
 *
 * Diese Datei ist die Quelle der Wahrheit für /admin/hilfe.
 * Bei neuen Features oder geänderter Bedienung hier ergänzen/aktualisieren.
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
  "Diese Seite erklärt, was die Fanclub-App kann und wie ihr als Vorstand die wichtigsten Admin-Aufgaben bedient. Nur Admins sehen diese Hilfe. Bei neuen Funktionen wird dieses Handbuch weitergeführt.";

export const ADMIN_HANDBOOK_SECTIONS: AdminHandbookSection[] = [
  {
    id: "ueberblick",
    title: "Was die App kann",
    summary: "Kurzüberblick für Mitglieder und Vorstand",
    blocks: [
      {
        type: "p",
        text: "Die App ist das digitale Zuhause des Anni Perka Fanclubs: Community, Termine, Punkte, Shop und Verwaltung.",
      },
      {
        type: "ul",
        items: [
          "Mitglieder: Profile, Verzeichnis, Kennenlernen-Fragen, Badges und Anni-Stars",
          "Community: Beiträge, Kommentare, Gruppenchat, Umfragen, Gewinnspiele",
          "Termine: Konzerte & TV (Artistflow), Fanclub-Treffen, Teilnahme markieren",
          "Finanzen: Mitgliedsbeiträge (Kalenderjahr), Buchhaltung, optional Merchandise",
          "E-Mail: Vorlagen, Signatur, Versandprotokoll — im Testmodus nur an Vorstände und die offizielle App-Adresse",
        ],
      },
      {
        type: "note",
        text: "Umfragen und Gewinnspiele pflegt ihr in den normalen App-Menüs (nicht nur im Admin-Hub). Admin-Rechte braucht ihr für Freigaben, Beiträge, Finanzen und Einstellungen.",
      },
    ],
  },
  {
    id: "zugang",
    title: "Admin-Zugang",
    summary: "Wer darf was und wo findet man den Admin-Bereich",
    blocks: [
      {
        type: "ul",
        items: [
          "Nur Profile mit Rolle „admin“ (Vorstand) sehen Admin-Seiten und diese Hilfe",
          "Einstieg: Menü / Dashboard → Admin-Hub unter /admin",
          "Eigene Mitgliedsseite und App-Nutzung bleiben für Admins wie für Mitglieder möglich",
        ],
      },
      {
        type: "link",
        href: "/admin",
        label: "Zum Admin-Hub",
        hint: "Übersicht aller Verwaltungsbereiche",
      },
    ],
  },
  {
    id: "mitglieder",
    title: "Mitglieder & Anträge",
    summary: "Freischalten, Beiträge, Sperre, Stammdaten",
    blocks: [
      {
        type: "ol",
        items: [
          "Neue Anträge erscheinen unter Mitglieder & Anträge (Status „beantragt“).",
          "Antrag prüfen (PDF/Daten) → freigeben: Mitgliedsnummer, Willkommens-Mail / App-Zugang.",
          "Offener Beitrag: Beitrags-Erinnerung senden (Verwendungszweck mit Name und Nr.).",
          "Bei Zahlungsrückstand: „Vorübergehend deaktivieren“ — Mitglied sieht Hinweis und kann die App nicht nutzen, bis ihr wieder freischaltet.",
          "Stammdaten-Änderungen von Mitgliedern unter „Stammdaten freigeben“ bestätigen.",
        ],
      },
      {
        type: "ul",
        items: [
          "Beitrag = 15 € pro Kalenderjahr (auch bei Beitritt mitten im Jahr).",
          "Mehrere offene Jahre möglich; Erinnerungen können pro Jahr gesendet werden.",
          "Überfällig nach 14 Tagen ab Fälligkeit.",
          "Jahres-Mail am 27.12. (Cron) an aktive Mitglieder — Vorlage „Jahresbeitrag“.",
        ],
      },
      {
        type: "link",
        href: "/admin/members",
        label: "Mitglieder & Anträge",
      },
      {
        type: "link",
        href: "/admin/members/profile-changes",
        label: "Stammdaten freigeben",
      },
      {
        type: "link",
        href: "/admin/membership-form",
        label: "Antragsformular / Link",
      },
    ],
  },
  {
    id: "empfehlungen",
    title: "Empfehlungen (Werbung)",
    summary: "Einladungen und Anni-Stars",
    blocks: [
      {
        type: "p",
        text: "Mitglieder können unter „Neues Mitglied werben“ Einladungen verschicken. Dafür gibt es Anni-Stars und das Badge „Werbeprofi“.",
      },
      {
        type: "ul",
        items: [
          "Beim Versand der Einladung: +20 Anni-Stars (einmal pro Empfänger-Adresse)",
          "Nach Freischaltung des geworbenen Mitglieds: +70 Anni-Stars",
          "Übersicht der Empfehlungen: Admin → Empfehlungen",
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
    id: "finanzen",
    title: "Finanzen & Shop",
    summary: "Beiträge, Buchhaltung, Merchandise",
    blocks: [
      {
        type: "ul",
        items: [
          "Zahlungen: offene Posten sehen und manuell freigeben/zuordnen",
          "Buchhaltung: Einnahmen/Ausgaben, Belege, Kategorien",
          "Merchandise (falls aktiv): Artikel, Bestand, Bestellungen, Versand",
        ],
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
    id: "email",
    title: "E-Mail & Kommunikation",
    summary: "SMTP, Vorlagen, Signatur, Testmodus",
    blocks: [
      {
        type: "ol",
        items: [
          "SMTP-Konto unter „Email Konten“ prüfen (Absender = offizielle App-Adresse).",
          "Vorlagen unter E-Mail-Vorlagen bearbeiten (Anrede {{salutation}}, Signatur wird automatisch angehängt).",
          "Club-Signatur unter Signaturen pflegen.",
          "Versand im E-Mail-Log kontrollieren; fehlgeschlagene Mails ggf. erneut senden.",
        ],
      },
      {
        type: "note",
        text: "Solange EMAIL_OUTBOUND_MODE nicht auf „live“ steht, gehen Mails nur an Admin-Adressen und die offizielle SMTP-/Reply-Adresse. So bleiben echte Mitglieder während Tests geschützt. Go-Live: in Vercel EMAIL_OUTBOUND_MODE=live setzen und neu deployen.",
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
        href: "/admin/signatures",
        label: "Signaturen",
      },
      {
        type: "link",
        href: "/admin/settings/email-log",
        label: "E-Mail-Historie",
      },
    ],
  },
  {
    id: "community",
    title: "Community & Moderation",
    summary: "Beiträge, Chat, Verwarnungen, Punkte",
    blocks: [
      {
        type: "ul",
        items: [
          "Mitgliederposts unter Beiträge freigeben oder ablehnen",
          "Verwarnungen über Moderation (Kommentar/Chat) — E-Mail und Hinweis in der App",
          "Umfragen und Gewinnspiele in den App-Menüs anlegen; Admins sehen Admin-Steuerung",
          "Anni-Stars & Badges: Jahresränge und Erfolge unter /punkte für Mitglieder",
          "Radio-Votings (falls aktiv): Charts und Runden unter Admin → Radio-Votings",
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
    title: "Events & Treffen",
    summary: "Artistflow und eigene Fanclub-Treffen",
    blocks: [
      {
        type: "ul",
        items: [
          "Konzerte/TV kommen über Artistflow-Sync (Admin → Artistflow-Sync).",
          "Eigene Fanclub-Treffen unter Admin → Fanclub-Treffen anlegen (Ort, Kosten, Teilnahme).",
          "Mitglieder melden Teilnahme in der App — sichtbar im Profil unter „Hier bin ich dabei“.",
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
        label: "Artistflow-Sync",
      },
    ],
  },
  {
    id: "punkte",
    title: "Anni-Stars, Ränge & Badges",
    summary: "Fairness und Jahreswertung",
    blocks: [
      {
        type: "ul",
        items: [
          "Anni-Stars zählen pro Kalenderjahr; am 1. Januar startet die Zählung neu",
          "Ränge (Jahres-Sterne): Fan → Aktiv-Fan → Treue-Fan → Silber-Fan → Gold-Fan → Diamond-Fan",
          "Badges (dauerhaft): z. B. Konzertprofi, Votingheld, Werbeprofi, Merch-Legende",
          "Keine Sterne für Eigenaktionen (eigener Beitrag, eigene Umfrage, …)",
          "Jahresende: Top 10 der Jahres-Sterne für die Sonderverlosung (Gewinnspiele)",
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
    id: "system",
    title: "System & Statistik",
    summary: "Nutzung und Audit",
    blocks: [
      {
        type: "ul",
        items: [
          "App-Statistik: aktive Mitglieder, App-Nutzung, Monatskurve",
          "Audit-Log: wichtige Admin-Aktionen nachvollziehen",
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
        label: "Audit-Log",
      },
    ],
  },
  {
    id: "checkliste",
    title: "Checkliste vor dem Go-Live",
    summary: "Kurz prüfen, bevor echte Mitglieder Mails bekommen",
    blocks: [
      {
        type: "ol",
        items: [
          "Genau die drei Vorstände haben role = admin (keine Test-Admins unnötig).",
          "SMTP und Signatur getestet (Look-Test an Vorstandsadresse).",
          "SQL-Migrationen für Beiträge (115), Sperre (116) und Badges (070/117) ausgeführt.",
          "Beitrags-Erinnerung und App-Zugang an einem Vorstand getestet.",
          "Erst dann EMAIL_OUTBOUND_MODE=live in Vercel setzen.",
        ],
      },
      {
        type: "note",
        text: "Dieses Handbuch wird bei neuen Features und Admin-Workflows weitergeführt — Anweisungen an die Entwicklung: „Admin-Handbuch aktualisieren“.",
      },
    ],
  },
];
