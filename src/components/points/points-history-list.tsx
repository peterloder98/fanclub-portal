"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { pointsReasonLabel } from "@/lib/points/reason-labels";

type TxRow = {
  id: string;
  points: number;
  reason: string;
  created_at: string;
};

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function PointsHistoryList({ userId }: { userId: string | null }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const { data } = await supabase
        .from("points_transactions")
        .select("id,points,reason,created_at")
        .eq("user_id", userId)
        .gte("created_at", yearStart)
        .order("created_at", { ascending: false })
        .limit(80);
      setRows((data ?? []) as TxRow[]);
      setLoading(false);
    })();
  }, [supabase, userId]);

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Deine Punkte-Historie</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {open ? "Aktuelles Kalenderjahr — scrollbar" : "Einklappen / Ausklappen"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && rows.length ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {rows.length}
            </span>
          ) : null}
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")}
            aria-hidden
          />
        </div>
      </button>

      {open ? (
        <div
          className="max-h-[min(320px,40vh)] overflow-y-auto overscroll-contain px-2 py-2"
          role="region"
          aria-label="Punkte-Historie"
          tabIndex={0}
        >
          {loading ? (
            <p className="px-2 py-4 text-sm text-slate-500">Wird geladen …</p>
          ) : rows.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">
              Noch keine Punkte in diesem Jahr — starte z. B. mit einem Like oder einer Umfrage.
            </p>
          ) : (
            <ul className="grid gap-1">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {pointsReasonLabel(r.reason)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {dateFmt.format(new Date(r.created_at))}
                    </div>
                  </div>
                  <span
                    className={
                      r.points >= 0
                        ? "shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold tabular-nums text-emerald-800"
                        : "shrink-0 rounded-lg bg-rose-50 px-2.5 py-1 text-sm font-bold tabular-nums text-rose-800"
                    }
                  >
                    {r.points >= 0 ? `+${r.points}` : r.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
