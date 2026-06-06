"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationRow,
} from "@/lib/notifications/actions";
import { presentNotification } from "@/lib/notifications/present";

/** Über Profil-Dropdown (9999) und Karten/Maps */
const PANEL_Z = 10_050;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [available, setAvailable] = useState(true);
  const [pending, startTransition] = useTransition();
  const [portalReady, setPortalReady] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0, width: 384 });
  const bellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const measurePanelPos = useCallback(() => {
    const el = bellRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 16);
    const right = Math.max(8, window.innerWidth - r.right);
    setPanelPos({ top: r.bottom + 6, right, width });
  }, []);

  function load() {
    startTransition(async () => {
      try {
        const data = await fetchMyNotifications(40);
        setItems(data.items);
        setUnread(data.unreadCount);
        setAvailable(data.available);
      } catch {
        setAvailable(false);
      }
    });
  }

  function toggleOpen() {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        measurePanelPos();
        load();
      }
      return next;
    });
  }

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`user-notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => load(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    measurePanelPos();
    const onReposition = () => measurePanelPos();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, measurePanelPos]);

  useEffect(() => {
    if (!open) return;

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (bellRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onEscape);
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!available) return null;

  const panel = (
    <div
      ref={panelRef}
      className="fixed pt-0"
      style={{
        zIndex: PANEL_Z,
        top: panelPos.top,
        right: panelPos.right,
        width: panelPos.width,
      }}
      role="dialog"
      aria-label="Benachrichtigungen"
      aria-modal="false"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="overflow-hidden rounded-2xl border bg-white shadow-lg shadow-slate-900/15">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold text-fc-navy">Benachrichtigungen</span>
          {unread > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await markAllNotificationsRead();
                  load();
                });
              }}
              className="text-xs font-medium text-fc-blue hover:underline disabled:opacity-50"
            >
              Alle gelesen
            </button>
          ) : null}
        </div>
        <ul className="max-h-[min(28rem,55dvh)] overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-3 py-8 text-center text-xs text-slate-500">
              Keine Benachrichtigungen.
            </li>
          ) : (
            items.map((n) => (
              <NotificationListItem
                key={n.id}
                n={n}
                onNavigate={() => setOpen(false)}
                onRead={() => {
                  if (!n.read_at) void markNotificationRead(n.id).then(load);
                }}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <div ref={bellRef} className="relative z-[1]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleOpen();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative grid h-11 w-11 place-items-center rounded-xl border bg-white shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
          aria-label="Benachrichtigungen"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Bell className="h-4 w-4 text-slate-600" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </div>
      {portalReady && open ? createPortal(panel, document.body) : null}
    </>
  );
}

function NotificationListItem({
  n,
  onNavigate,
  onRead,
}: {
  n: UserNotificationRow;
  onNavigate: () => void;
  onRead: () => void;
}) {
  const p = presentNotification(n);
  const Icon = p.icon;
  const unread = !n.read_at;

  const inner = (
    <div
      className={cn(
        "flex gap-2.5 px-3 py-3 transition hover:bg-slate-50/90",
        unread && "bg-fc-ice/35",
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-black/5",
          p.iconClass,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-fc-navy">{p.headline}</p>
          {p.hasTarget ? (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          ) : null}
        </div>
        {p.contextLabel ? (
          <p className="mt-1 text-[11px] font-medium leading-snug text-slate-600 line-clamp-2">
            {p.contextLabel}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-slate-500">{p.whenLabel}</p>
        {p.quote ? (
          <p className="mt-1.5 rounded-lg border border-slate-100 bg-slate-50/90 px-2 py-1.5 text-xs italic leading-snug text-slate-700 line-clamp-3">
            „{p.quote}"
          </p>
        ) : null}
      </div>
    </div>
  );

  if (p.href) {
    return (
      <li className="border-b last:border-b-0">
        <Link
          href={p.href}
          className="block"
          onClick={() => {
            onNavigate();
            onRead();
          }}
        >
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li className="border-b last:border-b-0">
      <button type="button" className="block w-full text-left" onClick={onRead}>
        {inner}
      </button>
    </li>
  );
}
