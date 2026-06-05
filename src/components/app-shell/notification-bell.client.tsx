"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type UserNotificationRow,
} from "@/lib/notifications/actions";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "Gerade eben";
  if (diff < 3_600_000) return `vor ${Math.floor(diff / 60_000)} Min.`;
  if (diff < 86_400_000) return `vor ${Math.floor(diff / 3_600_000)} Std.`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [available, setAvailable] = useState(true);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!available) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative grid h-11 w-11 place-items-center rounded-xl border bg-white shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
        aria-label="Benachrichtigungen"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4 text-slate-600" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      <div
        className={cn(
          "absolute right-0 top-full z-[60] w-[min(20rem,calc(100vw-2rem))] pt-2 transition-opacity duration-150",
          open ? "visible opacity-100" : "pointer-events-none invisible opacity-0",
        )}
      >
        <div className="overflow-hidden rounded-2xl border bg-white shadow-lg shadow-slate-900/15">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold text-slate-900">Benachrichtigungen</span>
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
                className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                Alle gelesen
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(24rem,50dvh)] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-slate-500">
                Keine Benachrichtigungen.
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b last:border-b-0">
                  {n.link_url ? (
                    <Link
                      href={n.link_url}
                      onClick={() => {
                        setOpen(false);
                        if (!n.read_at) {
                          void markNotificationRead(n.id).then(load);
                        }
                      }}
                      className={cn(
                        "block px-3 py-2.5 transition hover:bg-slate-50",
                        !n.read_at && "bg-blue-50/40",
                      )}
                    >
                      <NotificationItem n={n} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read_at) {
                          void markNotificationRead(n.id).then(load);
                        }
                      }}
                      className={cn(
                        "block w-full px-3 py-2.5 text-left transition hover:bg-slate-50",
                        !n.read_at && "bg-blue-50/40",
                      )}
                    >
                      <NotificationItem n={n} />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function NotificationItem({ n }: { n: UserNotificationRow }) {
  return (
    <>
      <div className="text-sm font-medium text-slate-900">{n.title}</div>
      {n.body ? <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.body}</div> : null}
      <div className="mt-1 text-[10px] text-slate-400">{formatWhen(n.created_at)}</div>
    </>
  );
}
