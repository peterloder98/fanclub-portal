"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
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
  const [segments, setSegments] = useState(() => parseIso(value));
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setSegments(parseIso(value));
    }
  }, [value]);

  function emit(next: { day: string; month: string; year: string }) {
    setSegments(next);
    onChange(toIso(next.day, next.month, next.year));
  }

  function onDayChange(raw: string) {
    const d = digitsOnly(raw, 2);
    const next = { ...segments, day: d };
    emit(next);
    if (d.length === 2) monthRef.current?.focus();
  }

  function onMonthChange(raw: string) {
    const m = digitsOnly(raw, 2);
    const next = { ...segments, month: m };
    emit(next);
    if (m.length === 2) yearRef.current?.focus();
  }

  function onYearChange(raw: string) {
    const y = digitsOnly(raw, 4);
    emit({ ...segments, year: y });
  }

  function onPickerChange(iso: string) {
    if (!iso) {
      setSegments({ day: "", month: "", year: "" });
      onChange("");
      return;
    }
    const parsed = parseIso(iso);
    setSegments(parsed);
    onChange(iso);
  }

  const inputClass =
    "h-11 w-full rounded-xl border bg-white px-2 text-center text-sm tabular-nums outline-none focus:ring-4 focus:ring-[color:var(--ring)]";

  const maxDate = new Date().toISOString().slice(0, 10);

  return (
    <div className={cn("grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            autoComplete="bday-day"
            maxLength={2}
            placeholder="TT"
            aria-label="Tag"
            value={segments.day}
            onChange={(e) => onDayChange(e.target.value)}
            className={cn(inputClass, "max-w-[4rem]")}
          />
          <span className="text-slate-400">.</span>
          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            autoComplete="bday-month"
            maxLength={2}
            placeholder="MM"
            aria-label="Monat"
            value={segments.month}
            onChange={(e) => onMonthChange(e.target.value)}
            className={cn(inputClass, "max-w-[4rem]")}
          />
          <span className="text-slate-400">.</span>
          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            autoComplete="bday-year"
            maxLength={4}
            placeholder="JJJJ"
            aria-label="Jahr"
            value={segments.year}
            onChange={(e) => onYearChange(e.target.value)}
            className={cn(inputClass, "max-w-[5.5rem]")}
          />
        </div>
        <span className="hidden text-xs text-slate-400 sm:inline">oder</span>
        <button
          type="button"
          onClick={() => datePickerRef.current?.showPicker?.() ?? datePickerRef.current?.click()}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Calendar className="h-4 w-4 text-fc-blue" aria-hidden />
          Kalender
        </button>
        <input
          ref={datePickerRef}
          type="date"
          max={maxDate}
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
          onChange={(e) => onPickerChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>
      <p className="text-xs text-slate-500">TT.MM.JJJJ eintippen oder über den Kalender wählen.</p>
    </div>
  );
}
