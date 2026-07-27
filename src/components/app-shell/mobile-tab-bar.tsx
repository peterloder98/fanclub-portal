"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  HeartHandshake,
  Home,
  Menu,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useChatUnread } from "@/components/chat/chat-unread-context";

const TAB_BAR_HEIGHT = "calc(3.5rem + env(safe-area-inset-bottom, 0px))";

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/mitglieder", label: "Club", icon: HeartHandshake },
] as const;

function isTabActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isOverflowRoute(pathname: string) {
  if (PRIMARY_TABS.some((t) => isTabActive(pathname, t.href))) return false;
  return true;
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { hasUnread } = useChatUnread();
  const moreActive = isOverflowRoute(pathname);

  useEffect(() => {
    document.documentElement.style.setProperty("--fanclub-mobile-tab-bar", TAB_BAR_HEIGHT);
    return () => {
      document.documentElement.style.setProperty("--fanclub-mobile-tab-bar", "0px");
    };
  }, []);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[1200] border-t border-fc-navy/10 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(20,49,101,0.08)] backdrop-blur lg:hidden"
      aria-label="Hauptnavigation"
    >
      <ul className="grid h-14 grid-cols-5">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(pathname, tab.href);
          const showUnread = tab.href === "/chat" && hasUnread && !active;
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition",
                  active ? "text-fc-navy" : "text-slate-500 active:text-fc-navy",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon
                    className={cn("h-5 w-5", active ? "text-fc-blue" : "text-slate-400")}
                    aria-hidden
                  />
                  {showUnread ? (
                    <span
                      className="absolute -right-1 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-rose-500 ring-2 ring-white"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="truncate">{tab.label}</span>
                {active ? (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-fc-blue" aria-hidden />
                ) : null}
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("fc-open-mobile-nav"))}
            className={cn(
              "relative flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition",
              moreActive ? "text-fc-navy" : "text-slate-500 active:text-fc-navy",
            )}
            aria-label="Mehr Menü öffnen"
          >
            <Menu
              className={cn("h-5 w-5", moreActive ? "text-fc-blue" : "text-slate-400")}
              aria-hidden
            />
            <span>Mehr</span>
            {moreActive ? (
              <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-fc-blue" aria-hidden />
            ) : null}
          </button>
        </li>
      </ul>
    </nav>
  );
}
