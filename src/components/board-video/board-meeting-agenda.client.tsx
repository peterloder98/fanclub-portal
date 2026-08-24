"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import type { BoardVideoAgendaItemRow } from "@/lib/board-video/types";

export function BoardMeetingAgenda({
  meetingId,
  inviteToken,
  checkoffEnabled,
  agendaOpen,
}: {
  meetingId: string;
  inviteToken?: string;
  checkoffEnabled: boolean;
  agendaOpen: boolean;
}) {
  const [items, setItems] = useState<BoardVideoAgendaItemRow[]>([]);
  const [draft, setDraft] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const res = await fetch(`/api/besprechung/agenda?meetingId=${encodeURIComponent(meetingId)}`);
    const data = (await res.json()) as { items?: BoardVideoAgendaItemRow[]; error?: string };
    if (data.items) setItems(data.items);
  }, [meetingId]);

  useEffect(() => {
    void reload();
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`board-agenda:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_video_meeting_agenda_items",
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meetingId, reload]);

  function postAgenda(body: Record<string, unknown>) {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/besprechung/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, inviteToken, ...body }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      await reload();
      setDraft("");
      setEditId(null);
    });
  }

  if (!agendaOpen) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        Der Raum ist noch nicht geöffnet. Ab 5 Minuten vor Start könnt ihr hier Agenda-Punkte eintragen.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-fc-navy/15 bg-white shadow-sm">
      <header className="border-b border-fc-navy/10 bg-gradient-to-r from-fc-navy to-fc-blue px-4 py-2.5 text-white">
        <p className="text-sm font-semibold">Agenda</p>
        <p className="text-[11px] text-white/80">
          Punkte eintragen und bearbeiten — mit Name. Abhaken geht während des Video-Calls.
        </p>
      </header>
      <div className="grid gap-3 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            postAgenda({ action: "upsert", text: draft.trim() });
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            placeholder="Neuer Gesprächspunkt…"
            className="min-w-0 flex-1 rounded-xl border border-fc-navy/15 px-3 py-2 text-sm outline-none focus:ring-4 focus:ring-[color:var(--ring)]"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fc-navy text-white hover:bg-fc-blue disabled:opacity-60"
            aria-label="Hinzufügen"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <ul className="divide-y divide-fc-navy/5 rounded-xl border border-fc-navy/10">
          {items.length === 0 ? (
            <li className="px-3 py-4 text-sm text-slate-500">Noch keine Punkte — tragt gern etwas ein.</li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="px-3 py-3">
                {editId === item.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      postAgenda({ action: "upsert", itemId: item.id, text: editDraft.trim() });
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value.slice(0, 500))}
                      className="min-w-0 flex-1 rounded-lg border border-fc-navy/15 px-2 py-1.5 text-sm"
                      autoFocus
                    />
                    <button type="submit" className="text-sm font-semibold text-fc-navy">
                      Speichern
                    </button>
                  </form>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      disabled={!checkoffEnabled || pending}
                      onClick={() =>
                        postAgenda({ action: "toggle", itemId: item.id, checked: !item.checked_at })
                      }
                      className={cn(
                        "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border",
                        item.checked_at
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent",
                        !checkoffEnabled && "cursor-not-allowed opacity-40",
                      )}
                      aria-label="Abhaken"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-snug text-slate-800",
                          item.checked_at && "text-slate-500 line-through",
                        )}
                      >
                        {item.body}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {item.created_by_name}
                        {item.updated_by_name ? ` · bearbeitet von ${item.updated_by_name}` : ""}
                        {item.checked_by_name ? ` · erledigt von ${item.checked_by_name}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(item.id);
                        setEditDraft(item.body);
                      }}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-fc-ice hover:text-fc-navy"
                      aria-label="Bearbeiten"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
