import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

const variants = {
  neutral:
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/70",
  brand:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/70",
  success:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70",
  warning:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70",
  danger:
    "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70",
} as const;

export function Badge(
  props: ComponentProps<"span"> & { variant?: keyof typeof variants },
) {
  const { className, variant = "neutral", ...rest } = props;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}

