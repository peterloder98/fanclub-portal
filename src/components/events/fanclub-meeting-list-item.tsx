import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEventListDate, formatEventVenueCityLine } from "@/lib/events/format";
import type { ClubMeetingListItem } from "@/lib/meetings/types";
import { cn } from "@/lib/cn";

export function FanclubMeetingListItem({
  meeting,
  active,
  onMouseEnter,
  onMouseLeave,
}: {
  meeting: ClubMeetingListItem;
  active?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const listDate = formatEventListDate(meeting.starts_at);
  const locationLine = formatEventVenueCityLine({
    venue: meeting.venue,
    city: meeting.city,
    country: meeting.country,
  });

  return (
    <article
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "overflow-hidden rounded-xl border border-fc-sky/25 bg-gradient-to-br from-fc-ice/60 to-white px-2 py-2 shadow-sm sm:px-3 sm:py-2.5",
        active && "border-2 border-fc-blue bg-fc-ice/80",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand" className="text-[10px]">
          Fanclub Treffen
        </Badge>
        {meeting.joined ? (
          <Badge variant="success" className="text-[10px]">
            Dabei
          </Badge>
        ) : null}
      </div>
      <div className="mt-1.5 flex gap-2 sm:gap-3">
        <div className="w-[4.5rem] shrink-0 text-right sm:w-20">
          <div className="text-xs font-bold tabular-nums text-fc-navy">{listDate}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-fc-blue" aria-hidden />
            <h3 className="text-sm font-semibold leading-snug text-fc-navy">{meeting.title}</h3>
          </div>
          {locationLine ? (
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">{locationLine}</p>
          ) : null}
          <Link
            href={`/treffen/${meeting.id}`}
            className="mt-2 inline-flex text-xs font-semibold text-fc-blue hover:underline"
          >
            Alle Infos & Teilnahme →
          </Link>
        </div>
      </div>
    </article>
  );
}
