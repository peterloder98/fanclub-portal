import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import type { UpcomingBirthdayRow } from "@/lib/members/upcoming-birthdays";

export function UpcomingBirthdays({ rows }: { rows: UpcomingBirthdayRow[] }) {
  if (!rows.length) {
    return <p className="px-2 py-4 text-sm text-slate-500">Keine Geburtstage eingetragen.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={r.userId} className="flex items-center gap-3 px-3 py-2.5">
          <HoverEnlargeAvatar name={r.name} avatarUrl={r.avatarUrl} size="sm">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-600">{r.dateLabel}</div>
            </div>
          </HoverEnlargeAvatar>
        </li>
      ))}
    </ul>
  );
}
