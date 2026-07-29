import { cn } from "@/lib/cn";
import { ANNI_STAR_COLOR, ANNI_STAR_SYMBOL } from "@/lib/anni-stars/format";

export function AnniStarCount({
  value,
  size = "md",
  tone = "default",
  className,
}: {
  value: number | string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "emphasis" | "onDark";
  className?: string;
}) {
  const starCls = cn(
    "shrink-0 leading-none",
    size === "sm" && "text-sm",
    size === "md" && "text-lg",
    size === "lg" && "text-2xl",
    tone === "onDark" && "text-amber-300 drop-shadow-sm",
  );
  const numCls = cn(
    "font-bold tabular-nums",
    tone === "default" && "text-fc-navy",
    tone === "emphasis" && "text-fc-navy",
    tone === "onDark" && "text-white drop-shadow-sm",
    size === "sm" && "text-base",
    size === "md" && tone === "emphasis" ? "text-3xl" : size === "md" && "text-2xl",
    size === "lg" && "text-3xl",
  );

  const starColor = tone === "onDark" ? undefined : ANNI_STAR_COLOR;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={starCls}
        style={starColor ? { color: starColor } : undefined}
        aria-hidden
      >
        {ANNI_STAR_SYMBOL}
      </span>
      <span className={numCls}>{value}</span>
      <span
        className={starCls}
        style={starColor ? { color: starColor } : undefined}
        aria-hidden
      >
        {ANNI_STAR_SYMBOL}
      </span>
    </span>
  );
}
