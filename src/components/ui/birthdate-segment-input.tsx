"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  clampDayInput,
  clampMonthInput,
  filterYearInput,
  segmentsToIso,
  validateBirthdateSegments,
} from "@/lib/person/birthdate";

function parseIso(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return { day: "", month: "", year: "" };
  return { year: m[1], month: m[2], day: m[3] };
}

function formatDe(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Geburtsdatum: TT.MM.JJJJ + Kalender-Button (schließt nach Auswahl). */
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
  const [error, setError] = useState<string | null>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setSegments(parseIso(value));
      setError(null);
    }
  }, [value]);

  function emit(next: { day: string; month: string; year: string }) {
    setSegments(next);
    const message = validateBirthdateSegments(next);
    setError(message);
    const iso = segmentsToIso(next.day, next.month, next.year);
    if (iso && !message) {
      onChange(iso);
    } else {
      onChange("");
    }
  }

  function onDayChange(raw: string) {
    const d = clampDayInput(raw);
    const next = { ...segments, day: d };
    emit(next);
    if (d.length === 2) monthRef.current?.focus();
  }

  function onMonthChange(raw: string) {
    const m = clampMonthInput(raw);
    const next = { ...segments, month: m };
    emit(next);
    if (m.length === 2) yearRef.current?.focus();
  }

  function onYearChange(raw: string) {
    const y = filterYearInput(raw);
    emit({ ...segments, year: y });
  }

  function onPickerChange(iso: string) {
    if (!iso) {
      setSegments({ day: "", month: "", year: "" });
      setError(null);
      onChange("");
      return;
    }
    const parsed = parseIso(iso);
    const message = validateBirthdateSegments(parsed);
    setSegments(parsed);
    setError(message);
    onChange(message ? "" : iso);
  }

  const inputClass =
    "h-11 w-full rounded-xl border bg-white px-2 text-center text-sm tabular-nums outline-none focus:ring-4 focus:ring-[color:var(--ring)]";
  const maxDate = new Date().toISOString().slice(0, 10);
  const invalidRing = error ? "border-rose-300 focus:ring-rose-200" : "";

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
            aria-invalid={Boolean(error)}
            value={segments.day}
            onChange={(e) => onDayChange(e.target.value)}
            className={cn(inputClass, "max-w-[4rem]", invalidRing)}
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
            aria-invalid={Boolean(error)}
            value={segments.month}
            onChange={(e) => onMonthChange(e.target.value)}
            className={cn(inputClass, "max-w-[4rem]", invalidRing)}
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
            aria-invalid={Boolean(error)}
            value={segments.year}
            onChange={(e) => onYearChange(e.target.value)}
            className={cn(inputClass, "max-w-[5.5rem]", invalidRing)}
          />
        </div>
        <label className="relative inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <Calendar className="h-4 w-4 text-fc-blue" aria-hidden />
          Kalender
          <input
            type="date"
            min="1900-01-01"
            max={maxDate}
            value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
            onChange={(e) => onPickerChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} per Kalender wählen`}
          />
        </label>
      </div>
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}

/** Allgemeines Datum (Beginn, Unterschrift) — Anzeige TT.MM.JJJJ, Kalender schließt nach Auswahl. */
export function AppDateInput({
  label,
  value,
  onChange,
  required,
  min,
  max,
  className,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
}) {
  const id = useId();
  const display = formatDe(value);

  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="relative">
        <div className="pointer-events-none flex h-11 items-center rounded-xl border bg-white px-3 text-sm text-slate-800">
          <span className={display ? "tabular-nums" : "text-slate-400"}>
            {display || "TT.MM.JJJJ"}
          </span>
          <Calendar className="ml-auto h-4 w-4 text-fc-blue" aria-hidden />
        </div>
        <input
          id={id}
          type="date"
          required={required}
          min={min}
          max={max}
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
    </label>
  );
}

function splitLocalDateTime(localValue: string): { date: string; time: string } {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(localValue);
  if (!m) return { date: "", time: "" };
  return { date: m[1], time: m[2] };
}

/**
 * Datum + Uhrzeit als getrennte Felder (Browser-Date/Time-Picker).
 * Ein unsichtbares `datetime-local` lässt auf Safari/Chrome oft nur das Datum zu —
 * deshalb explizit Datum und Uhrzeit.
 * Wert bleibt `YYYY-MM-DDTHH:mm` (lokal, wie datetime-local).
 */
export function AppDateTimeInput({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  /** `YYYY-MM-DDTHH:mm` (datetime-local). */
  value: string;
  onChange: (localValue: string) => void;
  required?: boolean;
  className?: string;
}) {
  const dateId = useId();
  const timeId = useId();
  const { date, time } = splitLocalDateTime(value);

  function emit(nextDate: string, nextTime: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(`${nextDate}T${nextTime || "00:00"}`);
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="relative min-w-0" htmlFor={dateId}>
          <span className="sr-only">{label} Datum</span>
          <div className="pointer-events-none flex h-11 items-center rounded-xl border bg-white px-3 text-sm text-slate-800">
            <span className={date ? "tabular-nums" : "text-slate-400"}>
              {date ? formatDe(date) : "TT.MM.JJJJ"}
            </span>
            <Calendar className="ml-auto h-4 w-4 shrink-0 text-fc-blue" aria-hidden />
          </div>
          <input
            id={dateId}
            type="date"
            required={required}
            value={date}
            onChange={(e) => emit(e.target.value, time || "21:00")}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <label className="w-[7.25rem]" htmlFor={timeId}>
          <span className="sr-only">{label} Uhrzeit</span>
          <input
            id={timeId}
            type="time"
            required={required}
            value={time}
            onChange={(e) => emit(date, e.target.value)}
            className="h-11 w-full rounded-xl border bg-white px-2 text-center text-sm tabular-nums outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
          />
        </label>
      </div>
    </div>
  );
}
