import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminMembersNav({
  active,
}: {
  active: "members" | "accounting";
}) {
  const items = [
    { id: "members" as const, label: "Mitglieder", href: "/admin/members" },
    { id: "accounting" as const, label: "Mini-Buchhaltung", href: "/admin/accounting" },
  ];

  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Mitgliederverwaltung"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-xl border px-4 text-sm font-semibold transition",
            active === item.id
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
