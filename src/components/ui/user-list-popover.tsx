"use client";

import type { MouseEvent, ReactNode } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/cn";

export type UserListEntry = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export function UserListPopover({
  label,
  users,
  loading,
  children,
  className,
  onMouseEnter,
  onClick,
}: {
  label: string;
  users: UserListEntry[];
  loading?: boolean;
  children: ReactNode;
  className?: string;
  onMouseEnter?: (e: MouseEvent<HTMLSpanElement>) => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span
      className={cn(
        "group/pop relative inline-flex shrink-0 rounded-lg px-2 py-1 tabular-nums hover:bg-white/80",
        className,
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-[60] mt-1.5 hidden w-56 rounded-xl border bg-white p-3 text-left text-xs text-slate-700 shadow-lg shadow-slate-900/15 group-hover/pop:block"
      >
        <span className="font-semibold text-slate-900">{label}</span>
        <span className="mt-2 block max-h-44 overflow-y-auto">
          {loading ? (
            "Lade…"
          ) : users.length ? (
            users.slice(0, 16).map((u) => (
              <span key={u.id} className="flex items-center gap-2 py-1">
                <UserAvatar name={u.name} avatarUrl={u.avatarUrl} size="xs" />
                <span className="min-w-0 truncate">{u.name}</span>
              </span>
            ))
          ) : (
            "Noch keine Einträge"
          )}
          {users.length > 16 ? (
            <span className="mt-1 block text-slate-500">+{users.length - 16} weitere…</span>
          ) : null}
        </span>
      </span>
    </span>
  );
}
