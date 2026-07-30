"use client";

import { useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { memberPortalPath } from "@/lib/members/intro-questions";

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

export function MemberDirectorySearch({ members }: { members: SearchableMember[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = normalize(q);
    if (needle.length < 2) return [];
    return members
      .filter((m) => {
        const hay = normalize(`${m.name} ${m.origin ?? ""}`);
        return hay.includes(needle);
      })
      .slice(0, 12);
  }, [members, q]);

  return (
    <section className="rounded-2xl border border-fc-ice bg-white p-3 shadow-sm sm:p-4">
      <div className="fc-accent-bar mb-2 w-16" />
      <label className="block">
        <span className="text-base font-semibold text-fc-navy">Mitglieder suchen</span>
        <span className="mt-0.5 block text-sm text-[color:var(--muted)]">
          Name oder Ort eingeben — Profil öffnen.
        </span>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="z. B. Vorname oder Stadt…"
            className="h-11 w-full rounded-xl border border-fc-navy/15 bg-fc-ice/40 pl-10 pr-3 text-sm text-fc-navy outline-none ring-fc-blue/30 placeholder:text-slate-400 focus:bg-white focus:ring-2"
            autoComplete="off"
          />
        </div>
      </label>

      {q.trim().length > 0 && q.trim().length < 2 ? (
        <p className="mt-2 text-xs text-slate-500">Mindestens 2 Zeichen eingeben.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {results.map((m) => (
            <li
              key={m.userId}
              className="rounded-xl border border-fc-navy/10 bg-fc-ice/40 px-3 py-2.5"
            >
              <HoverEnlargeAvatar
                name={m.name}
                avatarUrl={m.avatarUrl}
                size="sm"
                className="w-full gap-3"
                href={memberPortalPath(m.userId)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fc-navy">{m.name}</p>
                  {m.origin ? (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-600">
                      <MapPin className="h-3 w-3 shrink-0 text-fc-blue" aria-hidden />
                      <span className="truncate">{m.origin}</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-400">Ort noch offen</p>
                  )}
                  <p className="mt-1 text-[11px] font-medium text-fc-blue">Zum Profil →</p>
                </div>
              </HoverEnlargeAvatar>
            </li>
          ))}
        </ul>
      ) : q.trim().length >= 2 ? (
        <p className="mt-3 text-sm text-slate-500">Keine Treffer für „{q.trim()}“.</p>
      ) : null}
    </section>
  );
}
