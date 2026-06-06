import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  FileText,
  Gift,
  HeartHandshake,
  UserPlus,
  Mail,
  Mails,
  MapPinned,
  Train,
  Music2,
  PenLine,
  ScrollText,
  Shield,
  Users,
  Wallet,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/cn";

type AdminHubItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type AdminHubSection = {
  id: string;
  title: string;
  subtitle: string;
  items: AdminHubItem[];
};

/** Abwechselnde CI-Verläufe — kein Regenbogen mehr. */
const CI_ICON_GRADIENTS = [
  "from-fc-navy to-fc-blue",
  "from-fc-blue to-fc-sky",
  "from-fc-sky to-fc-navy",
  "from-fc-navy to-fc-sky",
] as const;

const SECTIONS: AdminHubSection[] = [
  {
    id: "members",
    title: "Mitglieder",
    subtitle: "Anträge prüfen, Profile pflegen, Formular & Einladungen.",
    items: [
      {
        href: "/admin/members",
        title: "Mitglieder & Anträge",
        description: "Liste, Freischaltung, Detailansicht und PDF.",
        icon: Users,
      },
      {
        href: "/admin/membership-form",
        title: "Antragsformular",
        description: "Öffentlicher Link, E-Mail-Versand an Interessenten.",
        icon: FileText,
      },
      {
        href: "/admin/referrals",
        title: "Empfehlungen",
        description: "Versendete Einladungen und erfolgreich geworbene Mitglieder.",
        icon: UserPlus,
      },
      {
        href: "/admin/accounting",
        title: "Buchhaltung",
        description: "Einnahmen, Ausgaben und Zahlungen pro Mitglied.",
        icon: Wallet,
      },
      {
        href: "/admin/merchandise",
        title: "Merchandise",
        description: "Fanschals, Kugelschreiber — Bestand, Größen, Fotos.",
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "email",
    title: "Kommunikation",
    subtitle: "SMTP, Vorlagen, Signaturen und Mitglieder-Mails.",
    items: [
      {
        href: "/admin/settings/email",
        title: "E-Mail / SMTP",
        description: "Versandserver, Absender und Verbindungstest.",
        icon: Mail,
      },
      {
        href: "/admin/settings/email-templates",
        title: "E-Mail & Geburtstagsgrüße",
        description: "System-Mails, Geburtstagspost-Vorlagen, Platzhalter.",
        icon: Mails,
      },
      {
        href: "/admin/signatures",
        title: "Signaturen",
        description: "Fanclub-Signatur und persönliche Admin-Unterschrift.",
        icon: PenLine,
      },
      {
        href: "/admin/settings/notifications",
        title: "Mitglieder-Benachrichtigungen",
        description: "E-Mail bei neuem Gewinnspiel oder neuer Umfrage.",
        icon: Bell,
      },
      {
        href: "/admin/settings/email-log",
        title: "E-Mail-Historie",
        description: "Gesendet, fehlgeschlagen — erneut senden.",
        icon: Mail,
      },
    ],
  },
  {
    id: "system",
    title: "System",
    subtitle: "Integrationen und technische Einstellungen.",
    items: [
      {
        href: "/admin/settings/spotify",
        title: "Spotify",
        description: "Web-Player im Portal und Extended Quota.",
        icon: Music2,
      },
      {
        href: "/admin/advent-calendar",
        title: "Adventskalender",
        description: "24 Türchen — Funktion in Vorbereitung.",
        icon: Gift,
      },
    ],
  },
  {
    id: "events",
    title: "Events & Treffen",
    subtitle: "Artistflow-Termine, eigene Fanclub-Treffen und Karte.",
    items: [
      {
        href: "/admin/treffen",
        title: "Fanclub Treffen",
        description: "Eigene Treffen anlegen — News-Seite mit Teilnahme für Mitglieder.",
        icon: HeartHandshake,
      },
      {
        href: "/events",
        title: "Events & Reise-Infos",
        description: "Termine ansehen — Admins bearbeiten Bahnhof/Hotel in der Eventliste.",
        icon: Train,
      },
      {
        href: "/admin/events-sync",
        title: "Artistflow Sync",
        description: "Sync, Teilnehmer & Pins reparieren, Geocoding und Logs.",
        icon: MapPinned,
      },
      {
        href: "/admin/audit",
        title: "Audit-Log",
        description: "Nachvollziehen, welcher Admin was geändert hat.",
        icon: ScrollText,
      },
    ],
  },
];

let tileGradientIndex = 0;

function AdminHubTile({ item }: { item: AdminHubItem }) {
  const Icon = item.icon;
  const gradient = CI_ICON_GRADIENTS[tileGradientIndex++ % CI_ICON_GRADIENTS.length];

  return (
    <Link
      href={item.href}
      className="group flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition hover:border-fc-sky/40 hover:shadow-md hover:shadow-fc-navy/8"
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm",
          gradient,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-fc-navy group-hover:text-fc-blue">
            {item.title}
          </h3>
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-fc-blue"
            aria-hidden
          />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
      </div>
    </Link>
  );
}

export function AdminHub() {
  tileGradientIndex = 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="rounded-2xl border border-fc-sky/25 bg-gradient-to-br from-fc-ice via-white to-fc-mist px-5 py-5 shadow-sm shadow-fc-navy/5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fc-navy to-fc-blue text-white shadow-sm">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-fc-navy">Admin-Bereich</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
              Alles für Moderation, Mitglieder und technische Einstellungen — nach Bereichen
              sortiert. Inhaltliche Verwaltung von Umfragen und Gewinnspielen erfolgt direkt in den
              jeweiligen Menüpunkten der App.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.id} className="space-y-3">
            <div className="px-0.5">
              <h3 className="text-base font-semibold text-fc-navy">{section.title}</h3>
              <p className="mt-0.5 text-sm text-slate-500">{section.subtitle}</p>
            </div>
            <ul
              className={cn(
                "grid gap-3",
                section.items.length > 1 ? "sm:grid-cols-2" : "max-w-xl",
              )}
            >
              {section.items.map((item) => (
                <li key={item.href}>
                  <AdminHubTile item={item} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
