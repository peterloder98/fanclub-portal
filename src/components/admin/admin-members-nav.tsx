"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { id: "members" as const, label: "Mitglieder", href: "/admin/members" },
  { id: "payments" as const, label: "Zahlungen", href: "/admin/payments" },
  { id: "accounting" as const, label: "Buchhaltung", href: "/admin/accounting" },
];

export function AdminMembersNav({
  active,
}: {
  active: "members" | "payments" | "accounting";
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  return (
    <nav
      className="sticky top-0 z-40 -mx-4 flex gap-2 overflow-x-auto border-b bg-[color:var(--background)] px-4 py-2 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:static lg:mx-0 lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden"
      aria-label="Mitgliederverwaltung"
    >
      {items.map((item) => {
        const isActive = active === item.id;
        const isPending = pendingHref === item.href && pathname !== item.href;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setPendingHref(item.href)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition",
              isActive
                ? "border-fc-navy bg-fc-navy text-white shadow-sm"
                : "border-slate-200 bg-white text-fc-navy hover:bg-fc-ice",
              isPending && "pointer-events-none opacity-60",
            )}
            aria-busy={isPending}
          >
            {isPending ? "Lädt …" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
