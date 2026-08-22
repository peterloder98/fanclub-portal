"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { UserListPopover, type UserListEntry } from "@/components/ui/user-list-popover";
import { cn } from "@/lib/cn";

const DEFAULT_VISIBLE = 5;

export function ParticipantAvatarStack({
  attendees,
  count,
  label,
  loading,
  onEnsure,
  currentUserId,
  visibleMax = DEFAULT_VISIBLE,
  className,
}: {
  attendees: UserListEntry[];
  count: number;
  label: string;
  loading?: boolean;
  onEnsure?: () => void;
  currentUserId?: string | null;
  visibleMax?: number;
  className?: string;
}) {
  if (count <= 0) return null;

  const ordered = [...attendees].sort((a, b) => {
    if (currentUserId && a.id === currentUserId) return -1;
    if (currentUserId && b.id === currentUserId) return 1;
    return a.name.localeCompare(b.name, "de");
  });

  const hasProfiles = ordered.length > 0;
  const shown = hasProfiles ? ordered.slice(0, visibleMax) : [];
  const overflow = hasProfiles ? Math.max(0, count - shown.length) : 0;

  return (
    <UserListPopover
      label={label}
      users={ordered.length ? ordered : attendees}
      loading={loading}
      align="start"
      onMouseEnter={() => onEnsure?.()}
      className={cn("!px-1 !py-0.5 hover:bg-slate-50/80", className)}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="inline-flex items-center pl-0.5">
          {hasProfiles ? (
            <>
              {shown.map((u, i) => (
                <span
                  key={u.id}
                  className="relative"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
                >
                  <UserAvatar
                    name={u.name}
                    avatarUrl={u.avatarUrl}
                    size="sm"
                    className={cn(
                      "h-7 w-7 border-2 border-white text-[10px] shadow-sm",
                      currentUserId && u.id === currentUserId && "ring-2 ring-emerald-400",
                    )}
                  />
                </span>
              ))}
              {overflow > 0 ? (
                <span
                  className="relative z-0 -ml-1.5 grid h-7 min-w-7 place-items-center rounded-full border-2 border-white bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600 shadow-sm"
                  aria-hidden
                >
                  +{overflow}
                </span>
              ) : null}
            </>
          ) : loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="relative h-7 w-7 animate-pulse rounded-full border-2 border-white bg-slate-200 shadow-sm"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}
                  aria-hidden
                />
              ))}
            </>
          ) : null}
        </span>
        <span className="truncate text-xs font-medium text-slate-600">{label}</span>
      </span>
    </UserListPopover>
  );
}
