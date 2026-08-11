"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { setLiveSessionRsvpAction } from "@/app/(app)/live/rsvp-actions";
import { ParticipantAvatarStack } from "@/components/ui/participant-avatar-stack";
import type { UserListEntry } from "@/components/ui/user-list-popover";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { profileDisplayName } from "@/lib/profiles/display";
import { cn } from "@/lib/cn";

function personenZugesagt(n: number) {
  if (n === 1) return "1 Person hat zugesagt";
  return `${n} Personen haben zugesagt`;
}

export function LiveSessionRsvpCard({
  sessionId,
  initialStatus,
}: {
  sessionId: string;
  initialStatus: "accepted" | "declined" | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [attendees, setAttendees] = useState<UserListEntry[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { count } = await supabase
      .from("live_session_rsvps")
      .select("user_id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "accepted");
    setAcceptedCount(count ?? 0);
  }, [sessionId]);

  const ensureAttendees = useCallback(async () => {
    if (listLoaded || loadingList) return;
    setLoadingList(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setMeId(user.id);

      const { data: rsvps } = await supabase
        .from("live_session_rsvps")
        .select("user_id")
        .eq("session_id", sessionId)
        .eq("status", "accepted");
      const ids = (rsvps ?? []).map((r) => r.user_id);
      if (!ids.length) {
        setAttendees([]);
        setListLoaded(true);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,email,avatar_path,updated_at")
        .in("id", ids);
      setAttendees(
        (profiles ?? []).map((p) => ({
          id: p.id,
          name: profileDisplayName({
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
          }),
          avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
        })),
      );
      setListLoaded(true);
    } finally {
      setLoadingList(false);
    }
  }, [sessionId, listLoaded, loadingList]);

  useEffect(() => {
    void refreshCount();
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMeId(data.user.id);
    });

    const channel = supabase
      .channel(`live-rsvp:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_session_rsvps",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          setListLoaded(false);
          void refreshCount();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, refreshCount]);

  function choose(next: "accepted" | "declined") {
    setError(null);
    startTransition(async () => {
      const result = await setLiveSessionRsvpAction(sessionId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const prev = status;
      setStatus(next);
      if (next === "accepted" && prev !== "accepted") {
        setAcceptedCount((c) => c + 1);
        setListLoaded(false);
      } else if (next === "declined" && prev === "accepted") {
        setAcceptedCount((c) => Math.max(0, c - 1));
        setAttendees((a) => a.filter((x) => x.id !== meId));
      }
    });
  }

  return (
    <section className="rounded-2xl border border-fc-navy/15 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-fc-navy">Bist du dabei?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Sag kurz zu oder ab. Bei Zusage erinnern wir dich einen Tag vorher per E-Mail.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("accepted")}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-60",
            status === "accepted"
              ? "bg-emerald-600 text-white"
              : "border border-fc-navy/15 bg-white text-fc-navy hover:bg-fc-ice",
          )}
        >
          <Check className="h-4 w-4" aria-hidden />
          Zusagen
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("declined")}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-60",
            status === "declined"
              ? "bg-slate-700 text-white"
              : "border border-fc-navy/15 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <X className="h-4 w-4" aria-hidden />
          Absagen
        </button>
      </div>
      {status === "accepted" ? (
        <p className="mt-2 text-sm text-emerald-700">Du hast zugesagt — danke!</p>
      ) : null}
      {status === "declined" ? (
        <p className="mt-2 text-sm text-slate-600">Du hast abgesagt. Du kannst das jederzeit ändern.</p>
      ) : null}

      <div className="mt-3 border-t border-slate-100 pt-3">
        {acceptedCount > 0 ? (
          <ParticipantAvatarStack
            attendees={attendees}
            count={acceptedCount}
            label={personenZugesagt(acceptedCount)}
            loading={loadingList}
            onEnsure={() => void ensureAttendees()}
            currentUserId={meId}
          />
        ) : (
          <span className="text-xs text-slate-500">Noch niemand hat zugesagt — sei die/der Erste!</span>
        )}
      </div>

      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
