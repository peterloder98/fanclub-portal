"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, UserPlus } from "lucide-react";
import { MEMBERSHIP_REFERRAL_POINTS } from "@/lib/points/award-membership-referral";
import { cn } from "@/lib/cn";

/** Hervorgehobener Block unter der Navigation — ein zusammenhängendes Badge. */
export function ReferMembershipNavCta() {
  const pathname = usePathname();
  const active = pathname.startsWith("/mitgliedschaft/einladen");

  return (
    <Link
      href="/mitgliedschaft/einladen"
      className={cn(
        "group block overflow-hidden rounded-2xl border transition",
        active
          ? "border-slate-800 bg-slate-900 text-white shadow-lg shadow-slate-900/25 ring-2 ring-slate-700/80"
          : "border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white to-blue-50/90 shadow-md shadow-amber-900/10 ring-1 ring-amber-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-900/15",
      )}
    >
      <div className="flex items-stretch gap-0">
        <div
          className={cn(
            "grid w-12 shrink-0 place-items-center",
            active
              ? "bg-white/10"
              : "bg-gradient-to-br from-blue-600 to-rose-500 text-white",
          )}
        >
          <UserPlus className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <p
            className={cn(
              "text-[13px] font-semibold leading-snug tracking-tight",
              active ? "text-white" : "text-slate-900",
            )}
          >
            Neues Mitglied werben
          </p>
          <p
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-1 text-[11px] font-medium leading-tight",
              active ? "text-blue-100" : "text-blue-800",
            )}
          >
            <span>Antrag senden</span>
            <span className={active ? "text-white/40" : "text-amber-400"} aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
              +{MEMBERSHIP_REFERRAL_POINTS} Punkte
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
