import Link from "next/link";
import {
  canMembersJoinSession,
  isInLiveGracePeriod,
  type LiveSessionRow,
} from "@/lib/live/types";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";

function statusMeta(session: LiveSessionRow) {
  const open = canMembersJoinSession(session);
  const grace = isInLiveGracePeriod(session);
  if (grace) {
    return {
      label: "Nachlauf",
      className: "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900",
    };
  }
  if (session.status === "live" || open) {
    return {
      label: session.status === "live" ? "Jetzt live" : "Raum offen",
      className: "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800",
    };
  }
  return {
    label: "Geplant",
    className: "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600",
  };
}

/** Kompakte Karte für weitere Termine unter der Haupt-Session. */
export function LiveSessionListCard({ session }: { session: LiveSessionRow }) {
  const meta = statusMeta(session);
  return (
    <Link
      href={`/live/${session.slug}`}
      className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-fc-navy/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-fc-navy">{session.title}</p>
          <p className="mt-1 text-xs text-slate-500">{formatBerlinDateTime(session.starts_at)}</p>
        </div>
        <span className={meta.className}>{meta.label}</span>
      </div>
    </Link>
  );
}
