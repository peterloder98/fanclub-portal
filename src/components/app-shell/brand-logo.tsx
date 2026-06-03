import Link from "next/link";
import { cn } from "@/lib/cn";

export function BrandLogo({
  className,
  imageClassName,
  showText = true,
}: {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
}) {
  return (
    <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/fanclub-logo.png"
        alt="Anni Perka offizieller Fanclub"
        width={44}
        height={44}
        className={cn(
          "h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm shadow-slate-900/10",
          imageClassName,
        )}
      />
      {showText ? (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-900">
            Anni Perka Fanclub
          </div>
          <div className="text-xs text-slate-600">Portal</div>
        </div>
      ) : null}
    </Link>
  );
}
