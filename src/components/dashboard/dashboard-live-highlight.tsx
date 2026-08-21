import Link from "next/link";
import { Video } from "lucide-react";
import { formatBerlinDateTime } from "@/lib/datetime/berlin";

export function DashboardLiveHighlight({
  session,
}: {
  session: { slug: string; title: string; status: string; startsAt: string };
}) {
  const live = session.status === "live";
  return (
    <Link
      href="/live"
      className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white px-4 py-3 shadow-sm transition hover:border-rose-300"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
        <Video className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
          {live ? "Jetzt live" : "Live-Raum offen"}
        </p>
        <p className="truncate font-semibold text-fc-navy">{session.title}</p>
        <p className="text-xs text-slate-500">
          Start {formatBerlinDateTime(session.startsAt)} — antippen zum Mitmachen
        </p>
      </div>
    </Link>
  );
}
