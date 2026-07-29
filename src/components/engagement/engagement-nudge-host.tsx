"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Gift, Vote, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { giveawayPhase } from "@/lib/giveaways/status-label";

const STORAGE_KEY = "fc_nudge_dismissed_v1";
const SESSION_KEY = "fc_nudge_session_v1";
const SHOW_MS = 10_000;
const MAX_PER_SESSION = 2;

/** Zufällige Wartezeit zwischen min und max (ms). */
function randomMs(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type NudgeKind = "poll" | "giveaway" | "event";

type NudgeItem = {
  id: string;
  kind: NudgeKind;
  title: string;
  body: string;
  href: string;
  cta: string;
};

type SessionState = { shown: number };

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-80)));
  } catch {
    /* ignore */
  }
}

function loadSession(): SessionState {
  if (typeof window === "undefined") return { shown: 0 };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { shown: 0 };
    const parsed = JSON.parse(raw) as SessionState;
    return { shown: typeof parsed.shown === "number" ? parsed.shown : 0 };
  } catch {
    return { shown: 0 };
  }
}

function persistSession(state: SessionState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function iconFor(kind: NudgeKind) {
  if (kind === "poll") return Vote;
  if (kind === "giveaway") return Gift;
  return Calendar;
}

export function EngagementNudgeHost() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<NudgeItem[]>([]);
  const [current, setCurrent] = useState<NudgeItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const sessionShownRef = useRef(loadSession().shown);
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback((id: string, remember: boolean) => {
    setVisible(false);
    window.setTimeout(() => {
      setCurrent(null);
      if (remember) {
        const next = loadDismissed();
        next.add(id);
        persistDismissed(next);
      }
      setQueue((q) => q.filter((x) => x.id !== id));
    }, 320);
  }, []);

  const scheduleNext = useCallback(
    (items: NudgeItem[], isFirst: boolean) => {
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
        scheduleRef.current = null;
      }
      if (!items.length) return;
      if (sessionShownRef.current >= MAX_PER_SESSION) return;
      if (pathname?.startsWith("/login") || pathname?.startsWith("/setup")) return;

      // Gelegentlich gar keinen weiteren Hinweis in dieser Session
      if (!isFirst && Math.random() < 0.35) return;

      const delay = isFirst
        ? randomMs(15_000, 90_000) // 15s – 1,5 min bis zum ersten Hinweis
        : randomMs(150_000, 480_000); // 2,5 – 8 min bis zum nächsten

      scheduleRef.current = setTimeout(() => {
        scheduleRef.current = null;
        if (sessionShownRef.current >= MAX_PER_SESSION) return;
        const next = items[0];
        if (!next) return;
        setCurrent(next);
        sessionShownRef.current += 1;
        persistSession({ shown: sessionShownRef.current });
        requestAnimationFrame(() => setVisible(true));
      }, delay);
    },
    [pathname],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const dismissed = loadDismissed();
      const now = Date.now();
      const inThreeDays = new Date(now + 3 * 86_400_000).toISOString();
      const nowIso = new Date(now).toISOString();
      const items: NudgeItem[] = [];

      const { data: polls } = await supabase
        .from("polls")
        .select("id,question,ends_at")
        .eq("is_active", true)
        .gt("ends_at", nowIso)
        .order("ends_at", { ascending: true })
        .limit(8);

      if (polls?.length) {
        const pollIds = polls.map((p) => p.id);
        const { data: myVotes } = await supabase
          .from("poll_votes")
          .select("poll_id")
          .eq("user_id", user.id)
          .in("poll_id", pollIds);
        const voted = new Set((myVotes ?? []).map((v) => v.poll_id));
        for (const p of polls) {
          const nid = `poll:${p.id}`;
          if (voted.has(p.id) || dismissed.has(nid)) continue;
          items.push({
            id: nid,
            kind: "poll",
            title: "Umfrage offen",
            body: `Du hast noch nicht an „${p.question}“ teilgenommen — hast du Interesse?`,
            href: `/polls/${p.id}`,
            cta: "Interessiert mich",
          });
        }
      }

      const { data: giveaways } = await supabase
        .from("giveaways")
        .select("id,title,ends_at,status,is_paused")
        .eq("is_active", true)
        .order("ends_at", { ascending: true })
        .limit(8);

      if (giveaways?.length) {
        const gIds = giveaways.map((g) => g.id);
        const { data: myEntries } = await supabase
          .from("giveaway_entries")
          .select("giveaway_id")
          .eq("user_id", user.id)
          .in("giveaway_id", gIds);
        const entered = new Set((myEntries ?? []).map((e) => e.giveaway_id));
        for (const g of giveaways) {
          const phase = giveawayPhase(g.ends_at, g.status, Boolean(g.is_paused));
          if (phase !== "active") continue;
          const nid = `giveaway:${g.id}`;
          if (entered.has(g.id) || dismissed.has(nid)) continue;
          items.push({
            id: nid,
            kind: "giveaway",
            title: "Gewinnspiel läuft",
            body: `Beim Gewinnspiel „${g.title}“ kannst du noch mitmachen — Lust?`,
            href: `/giveaways/${g.id}`,
            cta: "Interessiert mich",
          });
        }
      }

      const { data: events } = await supabase
        .from("external_events")
        .select("id,title,start_at,city,kind")
        .eq("is_visible", true)
        .gte("start_at", nowIso)
        .lte("start_at", inThreeDays)
        .order("start_at", { ascending: true })
        .limit(6);

      if (events?.length) {
        const eIds = events.map((e) => e.id);
        const { data: parts } = await supabase
          .from("event_participations")
          .select("event_id")
          .eq("user_id", user.id)
          .in("event_id", eIds);
        const joined = new Set((parts ?? []).map((p) => p.event_id));
        for (const e of events) {
          const nid = `event:${e.id}`;
          if (joined.has(e.id) || dismissed.has(nid)) continue;
          const when = e.start_at
            ? new Date(e.start_at).toLocaleDateString("de-DE", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })
            : "";
          const place = e.city ? ` in ${e.city}` : "";
          items.push({
            id: nid,
            kind: "event",
            title: e.kind === "tv" ? "TV bald" : "Event bald",
            body: `Bald ist „${e.title}“${place}${when ? ` (${when})` : ""} — bist du dabei?`,
            href: `/events?focus=${e.id}`,
            cta: "Interessiert mich",
          });
        }
      }

      if (!cancelled) {
        const shuffled = shuffle(items).slice(0, 6);
        setQueue(shuffled);
        setLoaded(true);
        if (shuffled.length && sessionShownRef.current < MAX_PER_SESSION) {
          scheduleNext(shuffled, true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scheduleNext]);

  useEffect(() => {
    if (!current || !visible) return;
    const t = window.setTimeout(() => dismiss(current.id, false), SHOW_MS);
    return () => clearTimeout(t);
  }, [current, visible, dismiss]);

  useEffect(() => {
    if (current) return;
    if (!loaded || !queue.length) return;
    if (sessionShownRef.current >= MAX_PER_SESSION) return;
    scheduleNext(queue, false);
    return () => {
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
        scheduleRef.current = null;
      }
    };
  }, [current, queue, loaded, scheduleNext]);

  useEffect(
    () => () => {
      if (scheduleRef.current) clearTimeout(scheduleRef.current);
    },
    [],
  );

  if (!current) return null;

  const Icon = iconFor(current.kind);

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-20 right-3 z-[90] w-[min(100vw-1.5rem,20rem)] transition-all duration-700 ease-out sm:bottom-6 sm:right-6",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
      role="dialog"
      aria-live="polite"
      aria-label={current.title}
    >
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-fc-navy/15 bg-white shadow-xl shadow-slate-900/15 ring-1 ring-black/5">
        <div className="flex items-start gap-2.5 p-3.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fc-ice text-fc-navy">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-fc-blue">
              {current.title}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-slate-800">{current.body}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link
                href={current.href}
                onClick={() => dismiss(current.id, true)}
                className="inline-flex h-8 items-center rounded-lg bg-fc-navy px-3 text-xs font-semibold text-white hover:bg-fc-blue"
              >
                {current.cta}
              </Link>
              <button
                type="button"
                onClick={() => dismiss(current.id, true)}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Verwerfen
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(current.id, true)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Schließen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
