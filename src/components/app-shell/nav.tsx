"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Gift,
  HeartHandshake,
  Home,
  PieChart,
  Shield,
  ShoppingBag,
  Sparkles,
  Vote,
} from "lucide-react";
import { SidebarNavTooltip } from "@/components/app-shell/sidebar-nav-tooltip";
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
  { label: "Mitglieder & Treffen", href: "/mitglieder", icon: HeartHandshake },
  { label: "Anni-Stars", href: "/punkte", icon: Sparkles },
  { label: "Admin", href: "/admin", icon: Shield, adminOnly: true },
];

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: AppNavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:min-h-0 lg:py-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-blue",
        active
          ? "bg-fc-navy text-white shadow-sm shadow-fc-navy/20"
          : "text-[color:var(--muted)] hover:bg-white hover:text-fc-navy hover:shadow-sm hover:shadow-fc-navy/5",
        collapsed && "h-10 w-10 justify-center px-0",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-white" : "text-fc-sky group-hover/nav:text-fc-blue",
        )}
        aria-hidden
      />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );

  if (collapsed) {
    return <SidebarNavTooltip label={item.label}>{link}</SidebarNavTooltip>;
  }
  return link;
}

export function NavList({
  items,
  isAdmin = true,
  collapsed = false,
}: {
  items: AppNavItem[];
  isAdmin?: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const visible = items.filter((i) => (i.adminOnly ? isAdmin : true));

  return (
    <nav className="group/nav flex flex-col gap-1">
      {visible.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <NavLink key={item.href} item={item} active={active} collapsed={collapsed} />
        );
      })}
    </nav>
  );
}
