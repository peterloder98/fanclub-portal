import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { AnniStarCount } from "@/components/anni-stars/anni-star-count";

type MemberStarsRankBadgeProps = {
  yearPoints: number;
  yearRank: string;
  variant?: "light" | "dark" | "card";
  className?: string;
  showLink?: boolean;
};

export function MemberStarsRankBadge({
  yearPoints,
  yearRank,
  variant = "card",
  className,
  showLink = false,
}: MemberStarsRankBadgeProps) {
  const inner = (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-3",
        variant === "card" &&
          "w-full rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-rose-50/60 px-4 py-3 shadow-sm",
        variant === "light" && "rounded-full bg-white/15 px-3 py-1.5",
        variant === "dark" && "rounded-xl bg-fc-navy/5 px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AnniStarCount value={yearPoints} size={variant === "light" ? "sm" : "md"} />
        <span
          className={cn(
            "text-xs font-medium",
            variant === "light" ? "text-white/85" : "text-slate-600",
          )}
        >
          Anni-Stars {new Date().getFullYear()}
        </span>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
          variant === "light" ? "bg-white/20 text-white" : "bg-fc-navy text-white shadow-sm",
        )}
      >
        <Star className="h-3 w-3 fill-current" aria-hidden />
        {yearRank}
      </span>
    </div>
  );

  if (showLink) {
    return (
      <Link href="/punkte" className="block transition hover:opacity-95">
        {inner}
      </Link>
    );
  }

  return inner;
}
