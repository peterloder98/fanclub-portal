"use client";

import { cn } from "@/lib/cn";
import { sanitizePostalCode } from "@/lib/postal-code";

export function PostalCodeInput({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="\d{5}"
        maxLength={5}
        required={required}
        value={value}
        placeholder="12345"
        onChange={(e) => onChange(sanitizePostalCode(e.target.value))}
        className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
      />
      <span className="text-xs text-slate-500">5 Ziffern, keine Buchstaben.</span>
    </label>
  );
}
