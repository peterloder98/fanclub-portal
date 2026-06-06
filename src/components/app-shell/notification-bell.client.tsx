"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserNotificationRow } from "@/lib/notifications/actions";
import {
  fetchNotificationsForUser,
  markAllNotificationsReadClient,
  markNotificationReadClient,
} from "@/lib/notifications/client";
import { presentNotification } from "@/lib/notifications/present";

const PANEL_Z = 10_200;
const OUTSIDE_LISTEN_DELAY_MS = 120;

type NotificationBellProps = {
  onOpenChange?: (open: boolean) => void;
  onRegisterClose?: (close: (() => void) | null) => void;
};

export function NotificationBell({ onOpenChange, onRegisterClose }: NotificationBellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 384 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
  }, []);

  const syncPanelPos = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(384, window.innerWidth - 16);
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPanelPos({ top: r.bottom + 6, left, width });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchNotificationsForUser(supabase, 40);
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Benachrichtigungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const toggleOpen = useCallback(() => {
    if (openRef.current) {
      close();
      return;
    }
    openRef.current = true;
    setOpen(true);
    syncPanelPos();
    void load();
  }, [close, load, syncPanelPos]);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    openRef.current = open;
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    onRegisterClose?.(close);
    return () => onRegisterClose?.(null);
  }, [close, onRegisterClose]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

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
            event: "*",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => void load(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  useEffect(() => {
    if (!open) return;

    syncPanelPos();
    const onReposition = () => syncPanelPos();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, syncPanelPos]);

  useEffect(() => {
    if (!open) return;

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    let removeOutside: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      function onOutside(e: MouseEvent) {
        if (!openRef.current) return;
        const target = e.target as Node;
        if (anchorRef.current?.contains(target)) return;
        if (panelRef.current?.contains(target)) return;
        close();
      }
      document.addEventListener("mousedown", onOutside);
      removeOutside = () => document.removeEventListener("mousedown", onOutside);
    }, OUTSIDE_LISTEN_DELAY_MS);

    document.addEventListener("keydown", onEscape);

    return () => {
      window.clearTimeout(timer);
      removeOutside?.();
      document.removeEventListener("keydown", onEscape);
    };
  }, [open, close]);

  const panel =
    open && portalReady
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed pt-0"
            style={{
              zIndex: PANEL_Z,
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }}
            role="dialog"
            aria-label="Benachrichtigungen"
          >
            <div className="overflow-hidden rounded-2xl border bg-white shadow-lg shadow-slate-900/15">
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <span className="text-sm font-semibold text-fc-navy">Benachrichtigungen</span>
                {unread > 0 ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void (async () => {
                        await markAllNotificationsReadClient(supabase);
                        await load();
                      })();
                    }}
                    className="text-xs font-medium text-fc-blue hover:underline disabled:opacity-50"
                  >
                    Alle gelesen
                  </button>
                ) : null}
              </div>
              <ul className="max-h-[min(28rem,55dvh)] overflow-y-auto overscroll-contain">
                {loadError ? (
                  <li className="px-3 py-6 text-center text-xs text-rose-600">{loadError}</li>
                ) : loading && items.length === 0 ? (
                  <li className="px-3 py-8 text-center text-xs text-slate-500">Wird geladen…</li>
                ) : items.length === 0 ? (
                  <li className="px-3 py-8 text-center text-xs text-slate-500">
                    Keine Benachrichtigungen.
                  </li>
                ) : (
                  items.map((n) => (
                    <NotificationListItem
                      key={n.id}
                      n={n}
                      onNavigate={close}
                      onRead={() => {
                        if (!n.read_at) {
                          void (async () => {
                            await markNotificationReadClient(supabase, n.id);
                            await load();
                          })();
                        }
                      }}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={anchorRef} className="relative h-11 w-11 shrink-0" style={{ zIndex: PANEL_Z }}>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={toggleOpen}
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
      {panel}
    </div>
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
