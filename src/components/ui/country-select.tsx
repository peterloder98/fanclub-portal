"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { COUNTRIES, type CountryOption } from "@/lib/countries";

export function CountrySelect({
  label,
  valueCode,
  onChange,
  required,
  className,
}: {
  label: string;
  valueCode: string;
  onChange: (country: CountryOption) => void;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected =
    COUNTRIES.find((c) => c.code === valueCode) ??
    COUNTRIES.find((c) => c.name === valueCode) ??
    COUNTRIES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative grid gap-1", className)}>
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-left text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="text-lg leading-none">{selected.flag}</span>
          <span className="truncate">{selected.name}</span>
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-xl border bg-white shadow-lg shadow-slate-900/10">
          <div className="border-b p-2">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Land suchen…"
              className="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.code === selected.code}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                    c.code === selected.code && "bg-fc-ice",
                  )}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              </li>
            ))}
            {!filtered.length ? (
              <li className="px-3 py-2 text-sm text-slate-500">Kein Treffer</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
