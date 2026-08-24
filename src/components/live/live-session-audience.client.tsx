"use client";

import { useCallback, useEffect, useState } from "react";
import { ParticipantAvatarStack } from "@/components/ui/participant-avatar-stack";
import type { UserListEntry } from "@/components/ui/user-list-popover";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

function dabeiLabel(count: number): string {
  if (count === 1) return "1 dabei";
  return `${count} dabei`;
}

export function LiveSessionAudience({
  sessionId,
  enabled,
  className,
  refreshNonce = 0,
}: {
  sessionId: string;
  enabled: boolean;
  className?: string;
  /** Nach eigenem Heartbeat erhöhen → Liste sofort aktualisieren. */
  refreshNonce?: number;
}) {
  const [count, setCount] = useState(0);
  const [members, setMembers] = useState<UserListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !sessionId) return;
    try {
      const res = await fetch(
        `/api/live/audience?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        count?: number;
        members?: UserListEntry[];
      };
      setCount(data.count ?? 0);
      setMembers(data.members ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [enabled, sessionId]);

  useEffect(() => {
    if (!enabled) return;
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data: { user } }) => setMeId(user?.id ?? null));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh, refreshNonce]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  if (!enabled) return null;

  if (count <= 0 && !loading) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-xl border border-fc-navy/10 bg-white px-2.5 py-1.5 text-xs text-slate-500 shadow-sm",
          className,
        )}
      >
        Du bist da — andere erscheinen hier, sobald sie im Live sind.
      </span>
    );
  }

  return (
    <ParticipantAvatarStack
      attendees={members}
      count={count}
      label={dabeiLabel(count)}
      loading={loading}
      onEnsure={() => void refresh()}
      currentUserId={meId}
      className={cn(
        "rounded-xl border border-fc-navy/10 bg-white px-2 py-1.5 shadow-sm",
        className,
      )}
    />
  );
}
