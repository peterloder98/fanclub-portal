import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  FileText,
  Gift,
  UserPlus,
  Mail,
  Mails,
  RefreshCw,
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
  BookOpen,
  Sparkles,
  Video,
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
    subtitle: "Beiträge, Buchungen und Zahlungen",
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
              description: "Artikel und Bestand",
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
        title: "E-Mail-Konten",
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
        href: "/admin/live",
        title: "Live mit Anni",
        description: "Session anlegen, Host-Link für Anni, beenden",
        icon: Video,
      },
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
    id: "system",
    title: "System",
    subtitle: "Hilfe, Sync, Statistik und Protokoll",
    items: [
      {
        href: "/admin/hilfe",
        title: "Admin-Handbuch",
        description: "Was die App kann und wie ihr sie bedient",
        icon: BookOpen,
      },
      {
        href: "/admin/events-sync",
        title: "Event Synchronisation",
        description: "Konzerttermine abgleichen, Geocoding und Diagnose",
        icon: RefreshCw,
      },
      {
        href: "/admin/app-stats",
        title: "App-Statistik",
        description: "Mitglieder aktiv, App-Nutzung und Monatskurve",
        icon: Activity,
      },
      {
        href: "/admin/audit",
        title: "Protokoll",
        description: "Wer hat wann was geändert",
        icon: ScrollText,
      },
      {
        href: "/willkommen?vorschau=1",
        title: "Willkommen-Vorschau",
        description: "Onboarding für neue Mitglieder durchspielen",
        icon: Sparkles,
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
        "group flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-gradient-to-r hover:from-fc-ice/80 hover:to-white",
        !isLast && "border-b border-slate-100",
      )}
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy/[0.06] text-fc-navy shadow-sm shadow-slate-900/5 transition group-hover:bg-fc-navy group-hover:text-white group-hover:shadow-md group-hover:shadow-fc-navy/20">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight text-fc-navy transition group-hover:text-fc-blue">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-slate-500 sm:text-[13px]">
          {item.description}
        </p>
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
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <div className="overflow-hidden rounded-2xl border border-fc-navy/10 bg-gradient-to-br from-fc-navy via-fc-navy to-fc-blue px-5 py-5 text-white shadow-lg shadow-fc-navy/15 sm:px-6">
        <div className="flex items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Admin-Bereich</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/80">
              Nach Themen sortiert. Umfragen, Gewinnspiele und Fanclub-Treffen pflegst du direkt in
              den jeweiligen App-Menüs — hier findest du Freigaben, Finanzen und System.
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Admin-Bereiche">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#admin-${section.id}`}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-900/5 transition hover:border-fc-sky/40 hover:bg-fc-ice hover:text-fc-navy"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <section key={section.id} id={`admin-${section.id}`} className="scroll-mt-24">
            <div className="mb-2.5 flex items-end justify-between gap-3 px-0.5">
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-fc-navy">
                  {section.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{section.subtitle}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                {section.items.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.02]">
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
