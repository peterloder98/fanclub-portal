"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ParticipantAvatarStack } from "@/components/ui/participant-avatar-stack";
import { personenNehmenTeil } from "@/lib/text/plural-de";
import { cn } from "@/lib/cn";
import { captureFlyRect, flyPointsFromElement } from "@/lib/points/fly";
import { POINT_VALUES } from "@/lib/points/values";
import type { UserListEntry } from "@/components/ui/user-list-popover";
import { useSoftLaunch } from "@/components/app-shell/soft-launch-banner.client";

export function EventParticipationRow({
  eventId,
  initialCount,
  initialJoined,
  initialAttendees,
  inline = false,
  tvMode = false,
}: {
  eventId: string;
  initialCount: number;
  initialJoined: boolean;
  initialAttendees: UserListEntry[];
  /** Kein eigenes Border-Wrapper (z. B. neben Kalender-Button). */
  inline?: boolean;
  /** TV-Auftritt: „Schaue ich mir an“. */
  tvMode?: boolean;
}) {
  const softLaunch = useSoftLaunch();
  const [joined, setJoined] = useState(initialJoined);
  const [count, setCount] = useState(initialCount);
  const [attendees, setAttendees] = useState(initialAttendees);
  const [meId, setMeId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blockMsg, setBlockMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) setMeId(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!softLaunch.canWrite) {
      setBlockMsg(softLaunch.writeBlockedMessage);
      return;
    }
    const fromRect = captureFlyRect(fromEl);
    setBusy(true);
    setBlockMsg(null);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }
    setMeId(user.id);
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
        flyPointsFromElement({ fromRect, delta: -POINT_VALUES.eventParticipation });
      } else {
        await supabase.from("event_participations").insert({
          event_id: eventId,
          user_id: user.id,
        });
        setJoined(true);
        setCount((c) => c + 1);
        const { data: profile } = await supabase
          .from("profiles")
          .select("id,first_name,last_name,email,avatar_path,updated_at")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          const { getAvatarPublicUrl } = await import("@/lib/avatars/url");
          const entry: UserListEntry = {
            id: profile.id,
            name:
              profile.first_name && profile.last_name
                ? `${profile.first_name} ${profile.last_name}`
                : (profile.email ?? "Du"),
            avatarUrl: getAvatarPublicUrl(profile.avatar_path, profile.updated_at),
          };
          setAttendees((a) => (a.some((x) => x.id === entry.id) ? a : [entry, ...a]));
        }
        flyPointsFromElement({ fromRect, delta: +POINT_VALUES.eventParticipation });
      }
    } finally {
      setBusy(false);
    }
  }

  const countLabel = tvMode
    ? count === 1
      ? "1 Person schaut zu"
      : `${count} Personen schauen zu`
    : personenNehmenTeil(count);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-2",
        !inline && "mt-2 border-t border-slate-100 pt-2",
      )}
    >
      <button
        type="button"
        disabled={busy || !softLaunch.canWrite}
        onClick={(e) => void toggleJoin(e.currentTarget)}
        className={cn(
          "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60",
          joined
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
            : "bg-fc-navy text-white hover:bg-fc-blue",
        )}
      >
        {joined
          ? tvMode
            ? "Schaue ich mir nicht an"
            : "Teilnahme zurücknehmen"
          : tvMode
            ? "Schaue ich mir an"
            : "Am Event teilnehmen"}
      </button>
      {blockMsg ? <p className="basis-full text-xs text-amber-800">{blockMsg}</p> : null}
      {count > 0 ? (
        <ParticipantAvatarStack
          attendees={attendees}
          count={count}
          label={countLabel}
          loading={loadingList}
          onEnsure={() => void ensureAttendees()}
          currentUserId={meId}
        />
      ) : (
        <span className="text-xs text-slate-500">
          {tvMode ? "Noch niemand schaut zu — sei die/der Erste!" : "Noch niemand dabei — sei die/der Erste!"}
        </span>
      )}
    </div>
  );
}
