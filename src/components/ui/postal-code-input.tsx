"use client";

import { cn } from "@/lib/cn";
import {
  postalCodeHint,
  sanitizePostalCode,
} from "@/lib/postal-code";

export function PostalCodeInput({
  label,
  value,
  onChange,
  required,
  className,
  countryCode = "DE",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  countryCode?: string;
}) {
  const c = countryCode.trim().toUpperCase() || "DE";
  const allowLetters = c === "NL";
  const maxLength = c === "DE" ? 5 : c === "CH" || c === "AT" ? 4 : c === "NL" ? 7 : 12;

  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        inputMode={allowLetters ? "text" : "numeric"}
        autoComplete="postal-code"
        maxLength={maxLength}
        required={required}
        value={value}
        placeholder={c === "NL" ? "7608 AB" : c === "CH" || c === "AT" ? "1234" : "12345"}
        onChange={(e) => onChange(sanitizePostalCode(e.target.value, c))}
        onKeyDown={(e) => {
          if (e.key.length === 1) {
            if (allowLetters) {
              if (!/[0-9a-zA-Z\s]/.test(e.key)) e.preventDefault();
            } else if (/\D/.test(e.key)) {
              e.preventDefault();
            }
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          onChange(sanitizePostalCode(e.clipboardData.getData("text"), c));
        }}
        className="h-11 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
      />
      <span className="text-xs text-slate-500">{postalCodeHint(c)}</span>
    </label>
  );
}
