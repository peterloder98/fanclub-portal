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

/** Über Profil-Dropdown, Maps und restliche Chrome — Glocke + Panel als ein Portalfixed-Block */
const PORTAL_Z = 10_200;

type NotificationBellProps = {
  onOpenChange?: (open: boolean) => void;
  onRegisterClose?: (close: (() => void) | null) => void;
};

export function NotificationBell({ onOpenChange, onRegisterClose }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [available, setAvailable] = useState(true);
  const [pending, startTransition] = useTransition();
  const [portalReady, setPortalReady] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 44, height: 44 });
  const [panelWidth, setPanelWidth] = useState(384);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const portalRootRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const close = useCallback(() => setOpen(false), []);

  const syncAnchor = useCallback(() => {
    const el = placeholderRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.top, left: r.left, width: r.width, height: r.height });
    setPanelWidth(Math.min(384, window.innerWidth - 16));
  }, []);

  function load() {
    startTransition(async () => {
      try {
        const data = await fetchMyNotifications(40);
        setItems(data.items);
        setUnread(data.unreadCount);
        setAvailable(data.available);
      } catch {
        /* Glocke sichtbar lassen */
      }
    });
  }

  function toggleOpen() {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        syncAnchor();
        load();
      }
      return next;
    });
  }

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    onRegisterClose?.(close);
    return () => onRegisterClose?.(null);
  }, [close, onRegisterClose]);

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
    syncAnchor();
    const onReposition = () => syncAnchor();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [syncAnchor]);

  useEffect(() => {
    if (!open) return;

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function onDocumentClick(e: MouseEvent) {
      const target = e.target as Node;
      if (portalRootRef.current?.contains(target)) return;
      close();
    }

    document.addEventListener("keydown", onEscape);
    const timer = window.setTimeout(() => {
      document.addEventListener("click", onDocumentClick);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onEscape);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [open, close]);

  if (!available) return null;

  const portaledUi =
    portalReady &&
    createPortal(
      <div
        ref={portalRootRef}
        className="fixed"
        style={{
          zIndex: PORTAL_Z,
          top: anchor.top,
          left: anchor.left,
          width: anchor.width,
        }}
      >
        <button
          type="button"
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

        {open ? (
          <div
            className="absolute right-0 pt-1.5"
            style={{
              top: anchor.height,
              width: panelWidth,
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
              <ul className="max-h-[min(28rem,55dvh)] overflow-y-auto overscroll-contain">
                {items.length === 0 ? (
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
                        if (!n.read_at) void markNotificationRead(n.id).then(load);
                      }}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </div>,
      document.body,
    );

  return (
    <>
      <div ref={placeholderRef} className="h-11 w-11 shrink-0" aria-hidden />
      {portaledUi}
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
