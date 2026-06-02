"use client";

import { cn } from "@/lib/cn";

export type PhoneCountry = {
  code: string;
  dial: string;
  flag: string;
  label: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "DE", dial: "+49", flag: "🇩🇪", label: "Deutschland" },
  { code: "AT", dial: "+43", flag: "🇦🇹", label: "Österreich" },
  { code: "CH", dial: "+41", flag: "🇨🇭", label: "Schweiz" },
  { code: "NL", dial: "+31", flag: "🇳🇱", label: "Niederlande" },
  { code: "BE", dial: "+32", flag: "🇧🇪", label: "Belgien" },
  { code: "FR", dial: "+33", flag: "🇫🇷", label: "Frankreich" },
  { code: "IT", dial: "+39", flag: "🇮🇹", label: "Italien" },
  { code: "ES", dial: "+34", flag: "🇪🇸", label: "Spanien" },
  { code: "GB", dial: "+44", flag: "🇬🇧", label: "Großbritannien" },
  { code: "US", dial: "+1", flag: "🇺🇸", label: "USA" },
];

export function formatFullPhone(dial: string, digits: string) {
  const d = digits.replace(/\D/g, "");
  return d ? `${dial}${d}` : "";
}

export function sanitizePhoneDigits(raw: string) {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
}

export function PhoneInput({
  label,
  dial,
  number,
  onDialChange,
  onNumberChange,
  required,
  className,
}: {
  label: string;
  dial: string;
  number: string;
  onDialChange: (dial: string) => void;
  onNumberChange: (digits: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="flex gap-2">
        <select
          value={dial}
          onChange={(e) => onDialChange(e.target.value)}
          className="h-11 min-w-[7.5rem] rounded-xl border bg-white px-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
          aria-label="Ländervorwahl"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          required={required}
          value={number}
          placeholder="ohne führende 0"
          onChange={(e) => onNumberChange(sanitizePhoneDigits(e.target.value))}
          className="h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        />
      </div>
      <span className="text-xs text-slate-500">Nur Ziffern, keine führende 0.</span>
    </label>
  );
}
