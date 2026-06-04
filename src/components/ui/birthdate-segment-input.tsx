"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

function digitsOnly(raw: string, max: number) {
  return raw.replace(/\D/g, "").slice(0, max);
}

function parseIso(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return { day: "", month: "", year: "" };
  return { year: m[1], month: m[2], day: m[3] };
}

function toIso(day: string, month: string, year: string) {
  if (day.length === 2 && month.length === 2 && year.length === 4) {
    return `${year}-${month}-${day}`;
  }
  return "";
}

export function BirthdateSegmentInput({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  className?: string;
}) {
  const { day, month, year } = parseIso(value);
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  function emit(nextDay: string, nextMonth: string, nextYear: string) {
    const iso = toIso(nextDay, nextMonth, nextYear);
    onChange(iso || "");
  }

  function onDayChange(raw: string) {
    const d = digitsOnly(raw, 2);
    emit(d, month, year);
    if (d.length === 2) monthRef.current?.focus();
  }

  function onMonthChange(raw: string) {
    const m = digitsOnly(raw, 2);
    emit(day, m, year);
    if (m.length === 2) yearRef.current?.focus();
  }

  function onYearChange(raw: string) {
    const y = digitsOnly(raw, 4);
    emit(day, month, y);
  }

  const inputClass =
    "h-11 w-full rounded-xl border bg-white px-2 text-center text-sm tabular-nums outline-none focus:ring-4 focus:ring-[color:var(--ring)]";

  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="flex items-center gap-2">
        <input
          ref={dayRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="TT"
          aria-label="Tag"
          required={required}
          value={day}
          onChange={(e) => onDayChange(e.target.value)}
          className={cn(inputClass, "max-w-[4rem]")}
        />
        <span className="text-slate-400">.</span>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="MM"
          aria-label="Monat"
          required={required}
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className={cn(inputClass, "max-w-[4rem]")}
        />
        <span className="text-slate-400">.</span>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="JJJJ"
          aria-label="Jahr"
          required={required}
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className={cn(inputClass, "max-w-[5.5rem]")}
        />
      </div>
    </label>
  );
}
