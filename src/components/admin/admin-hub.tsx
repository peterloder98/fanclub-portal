import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  FileText,
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
  iconClassName?: string;
};

type AdminHubSection = {
  id: string;
  title: string;
  subtitle: string;
  items: AdminHubItem[];
};

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
        iconClassName: "from-blue-600 to-indigo-600",
      },
      {
        href: "/admin/membership-form",
        title: "Antragsformular",
        description: "Öffentlicher Link, E-Mail-Versand an Interessenten.",
        icon: FileText,
        iconClassName: "from-violet-600 to-purple-600",
      },
      {
        href: "/admin/accounting",
        title: "Mini-Buchhaltung",
        description: "Einnahmen, Ausgaben und Zahlungen pro Mitglied.",
        icon: Wallet,
        iconClassName: "from-emerald-600 to-teal-600",
      },
      {
        href: "/admin/merchandise",
        title: "Merchandise",
        description: "Fanschals, Kugelschreiber — Bestand, Größen, Fotos.",
        icon: ShoppingBag,
        iconClassName: "from-orange-500 to-amber-600",
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
        iconClassName: "from-sky-600 to-blue-600",
      },
      {
        href: "/admin/settings/email-templates",
        title: "E-Mail & Geburtstagsgrüße",
        description: "System-Mails, Geburtstagspost-Vorlagen, Platzhalter.",
        icon: Mails,
        iconClassName: "from-cyan-600 to-teal-600",
      },
      {
        href: "/admin/signatures",
        title: "Signaturen",
        description: "Fanclub-Signatur und persönliche Admin-Unterschrift.",
        icon: PenLine,
        iconClassName: "from-amber-500 to-orange-600",
      },
      {
        href: "/admin/settings/notifications",
        title: "Mitglieder-Benachrichtigungen",
        description: "E-Mail bei neuem Gewinnspiel oder neuer Umfrage.",
        icon: Bell,
        iconClassName: "from-rose-500 to-pink-600",
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
        iconClassName: "from-emerald-600 to-green-600",
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    subtitle: "Termine aus Artistflow und Karte.",
    items: [
      {
        href: "/admin/events",
        title: "Event-Infos (Vorstand)",
        description: "Nächster Bahnhof, Hotel und Notizen pro Termin.",
        icon: Train,
        iconClassName: "from-violet-600 to-fuchsia-600",
      },
      {
        href: "/admin/events-sync",
        title: "Artistflow Sync",
        description: "Import, Geocoding, Logs und manueller Sync.",
        icon: MapPinned,
        iconClassName: "from-fuchsia-600 to-rose-600",
      },
      {
        href: "/admin/audit",
        title: "Audit-Log",
        description: "Nachvollziehen, welcher Admin was geändert hat.",
        icon: ScrollText,
        iconClassName: "from-slate-600 to-slate-800",
      },
    ],
  },
];

function AdminHubTile({ item }: { item: AdminHubItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="group flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/5 transition hover:border-blue-200/80 hover:shadow-md hover:shadow-slate-900/8"
    >
      <div
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm",
          item.iconClassName ?? "from-slate-600 to-slate-800",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900 group-hover:text-blue-800">
            {item.title}
          </h3>
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
            aria-hidden
          />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
      </div>
    </Link>
  );
}

export function AdminHub() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-slate-50 px-5 py-5 shadow-sm shadow-slate-900/5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-sm">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Admin-Bereich</h2>
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
              <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
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
