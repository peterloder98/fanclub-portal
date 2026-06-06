import Link from "next/link";
import { HeartHandshake, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ClubMeetingListItem } from "@/lib/meetings/types";
import { formatEventCity } from "@/lib/events/format";

export function DashboardMeetingHighlight({
  meeting,
}: {
  meeting: ClubMeetingListItem;
}) {
  const when = new Date(meeting.starts_at).toLocaleString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const location = [meeting.venue, formatEventCity({ city: meeting.city, country: meeting.country })]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="mb-4 overflow-hidden border-fc-sky/30 bg-gradient-to-br from-fc-ice via-white to-fc-gold-soft/40">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-fc-blue" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wide text-fc-blue">
                Nächstes Fanclub Treffen
              </span>
              {meeting.joined ? <Badge variant="success">Du nimmst teil</Badge> : null}
            </div>
            <h2 className="mt-2 text-lg font-semibold leading-snug text-fc-navy">
              {meeting.title}
            </h2>
            {meeting.summary ? (
              <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">
                {meeting.summary}
              </p>
            ) : null}
            <p className="mt-2 text-sm font-medium text-fc-navy">{when}</p>
            {location ? (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-[color:var(--muted)]">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-fc-sky" aria-hidden />
                {location}
              </p>
            ) : null}
          </div>
          <Link
            href={`/treffen/${meeting.id}`}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-fc-blue"
          >
            Details & Teilnahme
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
