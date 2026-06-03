"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Gift,
  Home,
  PieChart,
  Shield,
  UserPlus,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type AppNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Kleines Badge rechts neben dem Label */
  badge?: string;
  /** Hervorgehobener Menüpunkt (z. B. Werbung) */
  highlight?: boolean;
};

export const appNav: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Votings", href: "/votings", icon: Vote },
  { label: "Umfragen", href: "/polls", icon: PieChart },
  { label: "Gewinnspiele", href: "/giveaways", icon: Gift },
  {
    label: "Neues Mitglied werben",
    href: "/mitgliedschaft/einladen",
    icon: UserPlus,
    badge: "Antrag senden",
    highlight: true,
  },
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
];

export function NavList({
  items,
  isAdmin = true,
}: {
  items: AppNavItem[];
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const visible = items.filter((i) => (i.adminOnly ? isAdmin : true));

  return (
    <nav className="flex flex-col gap-1">
      {visible.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                : item.highlight
                  ? "border border-blue-200/80 bg-gradient-to-r from-blue-50/90 to-rose-50/50 text-slate-800 hover:border-blue-300 hover:shadow-sm"
                  : "text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:shadow-slate-900/5",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active
                  ? "text-white"
                  : item.highlight
                    ? "text-blue-600"
                    : "text-slate-500 group-hover:text-slate-700",
              )}
            />
            <span className="min-w-0 flex-1 truncate leading-snug">{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-blue-600 text-white shadow-sm",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

