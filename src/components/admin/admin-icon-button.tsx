"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

/**
 * Admin-Aktions-Icons — einheitliches Farbschema:
 * - edit: neutral/CI-blau (keine Destruktiv-Farbe)
 * - delete: rose (semantisch destruktiv — bewusst NICHT Fanclub-blau)
 * - warn: gold/amber (Vorsicht, keine Löschung)
 */
export type AdminActionVariant = "edit" | "delete" | "warn" | "neutral";

const VARIANT_CLASS: Record<AdminActionVariant, string> = {
  edit: "border-fc-sky/35 text-fc-blue hover:border-fc-sky/55 hover:bg-fc-ice",
  delete: "border-rose-200 text-rose-600 hover:bg-rose-50",
  warn: "border-amber-200 text-amber-700 hover:bg-fc-gold-soft",
  neutral: "border-slate-200/90 text-fc-navy hover:bg-fc-ice",
};

const SIZE_CLASS = {
  sm: "h-9 w-9 rounded-lg",
  md: "h-11 w-11 rounded-xl",
} as const;

type AdminIconButtonProps = {
  label: string;
  icon: LucideIcon;
  variant?: AdminActionVariant;
  size?: keyof typeof SIZE_CLASS;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  href?: string;
};

export function AdminIconButton({
  label,
  icon: Icon,
  variant = "neutral",
  size = "md",
  disabled,
  className,
  onClick,
  href,
}: AdminIconButtonProps) {
  const base = cn(
    "inline-flex items-center justify-center border bg-white shadow-sm shadow-slate-900/5 transition disabled:opacity-50",
    SIZE_CLASS[size],
    VARIANT_CLASS[variant],
    className,
  );
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const inner =
    href && !disabled ? (
      <Link href={href} aria-label={label} className={base}>
        <Icon className={iconSize} aria-hidden />
      </Link>
    ) : (
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={base}
      >
        <Icon className={iconSize} aria-hidden />
      </button>
    );

  return <HoverTooltip label={label}>{inner}</HoverTooltip>;
}
