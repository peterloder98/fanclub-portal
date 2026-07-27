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
  PenLine,
  Radio,
  ScrollText,
  Shield,
  Users,
  Wallet,
  CreditCard,
  ShoppingBag,
  FileCheck,
  Server,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

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

const SECTIONS: AdminHubSection[] = [
  {
    id: "members",
    title: "Mitglieder",
    subtitle: "Anträge, Profile und Einladungen",
    items: [
      {
        href: "/admin/members",
        title: "Mitglieder & Anträge",
        description: "Liste, Freischaltung, Details und PDF",
        icon: Users,
      },
      {
        href: "/admin/members/profile-changes",
        title: "Stammdaten freigeben",
        description: "Änderungswünsche prüfen und bestätigen",
        icon: FileCheck,
      },
      {
        href: "/admin/membership-form",
        title: "Antragsformular",
        description: "Öffentlicher Link und Versand an Interessenten",
        icon: FileText,
      },
      {
        href: "/admin/referrals",
        title: "Empfehlungen",
        description: "Einladungen und geworbene Mitglieder",
        icon: UserPlus,
      },
    ],
  },
  {
    id: "finance",
    title: "Finanzen & Shop",
    subtitle: "Beiträge, Buchungen und Merchandise",
    items: [
      {
        href: "/admin/payments",
        title: "Zahlungen",
        description: "Offene Posten und manuelle Freigabe",
        icon: CreditCard,
      },
      {
        href: "/admin/accounting",
        title: "Buchhaltung",
        description: "Einnahmen, Ausgaben und bestätigte Buchungen",
        icon: Wallet,
      },
      ...(FEATURE_FLAGS.merchandise
        ? [
            {
              href: "/admin/merchandise",
              title: "Merchandise",
              description: "Artikel, Bestand, Bestellungen",
              icon: ShoppingBag,
            } satisfies AdminHubItem,
          ]
        : []),
    ],
  },
  {
    id: "email",
    title: "E-Mail & Kommunikation",
    subtitle: "Versand, Vorlagen und Benachrichtigungen",
    items: [
      {
        href: "/admin/settings/email",
        title: "Email Konten verwalten",
        description: "Server, Absender und Verbindungstest",
        icon: Server,
      },
      {
        href: "/admin/settings/email-templates",
        title: "E-Mail-Vorlagen",
        description: "System-Mails und Geburtstagsposts",
        icon: Mails,
      },
      {
        href: "/admin/signatures",
        title: "Signaturen",
        description: "Club-Signatur und Admin-Unterschrift",
        icon: PenLine,
      },
      {
        href: "/admin/settings/notifications",
        title: "Benachrichtigungen",
        description: "Automatische Hinweise an Mitglieder",
        icon: Bell,
      },
      {
        href: "/admin/settings/email-log",
        title: "E-Mail-Historie",
        description: "Gesendet, fehlgeschlagen, erneut senden",
        icon: Mail,
      },
    ],
  },
  {
    id: "community",
    title: "Community",
    subtitle: "Beiträge und Engagement",
    items: [
      {
        href: "/admin/posts",
        title: "Beiträge freigeben",
        description: "Mitgliederposts annehmen oder ablehnen",
        icon: FileCheck,
      },
      ...(FEATURE_FLAGS.votings
        ? [
            {
              href: "/admin/radio-votings",
              title: "Radio-Votings",
              description: "Charts pflegen und neue Runden starten",
              icon: Radio,
            } satisfies AdminHubItem,
          ]
        : []),
      {
        href: "/admin/advent-calendar",
        title: "Adventskalender",
        description: "24 Türchen — in Vorbereitung",
        icon: Gift,
      },
    ],
  },
  {
    id: "events",
    title: "Events & Treffen",
    subtitle: "Termine und Sync",
    items: [
      {
        href: "/admin/treffen",
        title: "Fanclub-Treffen",
        description: "Eigene Treffen anlegen und verwalten",
        icon: HeartHandshake,
      },
      {
        href: "/admin/events-sync",
        title: "Artistflow-Sync",
        description: "Sync, Geocoding und Diagnose",
        icon: MapPinned,
      },
    ],
  },
  {
    id: "system",
    title: "System",
    subtitle: "Statistik und Protokoll",
    items: [
      {
        href: "/admin/app-stats",
        title: "App-Statistik",
        description: "Mitglieder aktiv, App-Nutzung und Monatskurve",
        icon: Activity,
      },
      {
        href: "/admin/audit",
        title: "Audit-Log",
        description: "Wer hat wann was geändert",
        icon: ScrollText,
      },
    ],
  },
];

function AdminHubRow({ item, isLast }: { item: AdminHubItem; isLast: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 px-4 py-3.5 transition hover:bg-fc-ice/70",
        !isLast && "border-b border-slate-100",
      )}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fc-navy/5 text-fc-navy transition group-hover:bg-fc-navy group-hover:text-white">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fc-navy group-hover:text-fc-blue">{item.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:text-sm">{item.description}</p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-fc-blue"
        aria-hidden
      />
    </Link>
  );
}

export function AdminHub() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-start gap-3 px-0.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy text-white">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fc-navy">Admin</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Nach Bereichen sortiert — Umfragen und Gewinnspiele pflegst du in den jeweiligen App-Menüs.
          </p>
        </div>
      </div>

      <nav
        className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3"
        aria-label="Admin-Bereiche"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#admin-${section.id}`}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-fc-ice hover:text-fc-navy"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-2">
        {SECTIONS.map((section) => (
          <section key={section.id} id={`admin-${section.id}`} className="scroll-mt-20">
            <div className="mb-2 px-0.5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-fc-navy/80">
                {section.title}
              </h3>
              <p className="text-xs text-slate-500">{section.subtitle}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5">
              <ul>
                {section.items.map((item, index) => (
                  <li key={item.href}>
                    <AdminHubRow item={item} isLast={index === section.items.length - 1} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
