import { cn } from "@/lib/cn";
import { ANNI_STAR_COLOR, ANNI_STAR_SYMBOL } from "@/lib/anni-stars/format";

export function AnniStarCount({
  value,
  size = "md",
  className,
}: {
  value: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const starCls = cn(
    "shrink-0 leading-none",
    size === "sm" && "text-sm",
    size === "md" && "text-lg",
    size === "lg" && "text-2xl",
  );
  const numCls = cn(
    "font-bold tabular-nums text-fc-navy",
    size === "sm" && "text-sm",
    size === "md" && "text-2xl",
    size === "lg" && "text-3xl",
  );

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={starCls} style={{ color: ANNI_STAR_COLOR }} aria-hidden>
        {ANNI_STAR_SYMBOL}
      </span>
      <span className={numCls}>{value}</span>
      <span className={starCls} style={{ color: ANNI_STAR_COLOR }} aria-hidden>
        {ANNI_STAR_SYMBOL}
      </span>
    </span>
  );
}
