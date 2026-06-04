"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UserListPopover } from "@/components/ui/user-list-popover";
import { personenNehmenTeil } from "@/lib/text/plural-de";
import { cn } from "@/lib/cn";
import { flyPointsFromElement } from "@/lib/points/fly";
import { POINT_VALUES } from "@/lib/points/values";
import type { UserListEntry } from "@/components/ui/user-list-popover";

export function EventParticipationRow({
  eventId,
  initialCount,
  initialJoined,
  initialAttendees,
  inline = false,
}: {
  eventId: string;
  initialCount: number;
  initialJoined: boolean;
  initialAttendees: UserListEntry[];
  /** Kein eigenes Border-Wrapper (z. B. neben Kalender-Button). */
  inline?: boolean;
}) {
  const [joined, setJoined] = useState(initialJoined);
  const [count, setCount] = useState(initialCount);
  const [attendees, setAttendees] = useState(initialAttendees);
  const [loadingList, setLoadingList] = useState(false);
  const [busy, setBusy] = useState(false);

  async function ensureAttendees() {
    if (attendees.length >= count && count > 0) return;
    setLoadingList(true);
    const supabase = createSupabaseBrowserClient();
    const { data: rows } = await supabase
      .from("event_participations")
      .select("user_id")
      .eq("event_id", eventId);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) {
      setAttendees([]);
      setLoadingList(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", ids);
    const { getAvatarPublicUrl } = await import("@/lib/avatars/url");
    setAttendees(
      (profiles ?? []).map((p) => ({
        id: p.id,
        name:
          p.first_name && p.last_name
            ? `${p.first_name} ${p.last_name}`
            : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      })),
    );
    setLoadingList(false);
  }

  async function toggleJoin(fromEl: HTMLElement) {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    try {
      if (joined) {
        await supabase
          .from("event_participations")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        setJoined(false);
        setCount((c) => Math.max(0, c - 1));
        setAttendees((a) => a.filter((x) => x.id !== user.id));
        flyPointsFromElement({ fromEl, delta: -POINT_VALUES.eventParticipation });
      } else {
        await supabase.from("event_participations").insert({
          event_id: eventId,
          user_id: user.id,
        });
        setJoined(true);
        setCount((c) => c + 1);
        flyPointsFromElement({ fromEl, delta: +POINT_VALUES.eventParticipation });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        !inline && "mt-2 border-t border-slate-100 pt-2",
      )}
    >
      <button
        type="button"
        disabled={busy}
        onClick={(e) => void toggleJoin(e.currentTarget)}
        className={cn(
          "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
          joined
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
            : "bg-slate-900 text-white hover:bg-slate-800",
        )}
      >
        {joined ? "Teilnahme zurücknehmen" : "Am Event teilnehmen"}
      </button>
      {count > 0 ? (
        <UserListPopover
          label="Wer nimmt teil?"
          users={attendees}
          loading={loadingList}
          align="end"
          onMouseEnter={() => void ensureAttendees()}
        >
          <span className="text-xs font-medium text-slate-600">
            {personenNehmenTeil(count)}
          </span>
        </UserListPopover>
      ) : (
        <span className="text-xs text-slate-500">Noch keine Teilnehmer</span>
      )}
    </div>
  );
}
