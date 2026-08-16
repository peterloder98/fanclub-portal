"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, X } from "lucide-react";
import { MemberProfileAnchor } from "@/components/members/member-profile-anchor";
import { cn } from "@/lib/cn";

export type SearchableMember = {
  userId: string;
  name: string;
  origin: string | null;
  avatarUrl: string | null;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Kompakte Suche für die Toolbar neben den Mitglieder-Tabs. */
export function MemberDirectorySearch({
  members,
  className,
}: {
  members: SearchableMember[];
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const needle = normalize(q);
    if (needle.length < 2) return [];
    return members
      .filter((m) => {
        const hay = normalize(`${m.name} ${m.origin ?? ""}`);
        return hay.includes(needle);
      })
      .slice(0, 8);
  }, [members, q]);

  const showPanel = open && q.trim().length >= 2;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative min-w-0 flex-1 sm:max-w-xs lg:max-w-sm", className)}>
      <label className="sr-only" htmlFor="member-directory-search">
        Mitglieder suchen
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id="member-directory-search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Mitglieder suchen…"
          className="h-9 w-full rounded-xl border border-fc-ice bg-white pl-9 pr-8 text-sm text-fc-navy outline-none ring-fc-blue/30 placeholder:text-slate-400 focus:border-fc-blue/40 focus:ring-2"
          autoComplete="off"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-slate-400 hover:text-fc-navy"
            aria-label="Suche leeren"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <ul
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-fc-navy/10 bg-white py-1 shadow-lg shadow-fc-navy/10"
          role="listbox"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Keine Treffer</li>
          ) : (
            results.map((m) => (
              <li key={m.userId} role="option">
                <MemberProfileAnchor
                  userId={m.userId}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-fc-ice/70"
                  linkProps={{ onClick: () => setOpen(false) }}
                >
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fc-ice text-xs font-semibold text-fc-navy">
                      {m.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fc-navy">{m.name}</span>
                    {m.origin ? (
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {m.origin}
                      </span>
                    ) : null}
                  </span>
                </MemberProfileAnchor>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
