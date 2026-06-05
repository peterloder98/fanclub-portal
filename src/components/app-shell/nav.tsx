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
  ShoppingBag,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type AppNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const appNav: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Votings", href: "/votings", icon: Vote },
  { label: "Umfragen", href: "/polls", icon: PieChart },
  { label: "Gewinnspiele", href: "/giveaways", icon: Gift },
  { label: "Merchandise", href: "/merchandise", icon: ShoppingBag },
  { label: "Mitglieder", href: "/mitglieder", icon: Users },
  { label: "Statuspunkte", href: "/punkte", icon: Sparkles },
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
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
              active
                ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                : "text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:shadow-slate-900/5",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-white" : "text-slate-500 group-hover:text-slate-700",
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

