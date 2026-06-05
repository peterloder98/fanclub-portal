"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin/merchandise", label: "Artikel", match: (p: string) => p.startsWith("/admin/merchandise") && !p.includes("/orders") },
  { href: "/admin/merchandise/orders", label: "Bestellungen", match: (p: string) => p.startsWith("/admin/merchandise/orders") },
] as const;

export function MerchandiseAdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 rounded-xl border bg-white p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "min-h-11 flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition sm:flex-none",
              active
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
