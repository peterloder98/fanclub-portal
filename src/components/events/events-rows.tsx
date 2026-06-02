import { formatEventStart, formatLocation } from "@/lib/events/format";

export type ExternalEventRow = {
  id: string;
  title: string;
  start_at: string | null;
  venue: string | null;
  city: string | null;
  address: string | null;
  postal_code?: string | null;
  ticket_url: string | null;
};

export function EventsRows({ events }: { events: ExternalEventRow[] }) {
  return (
    <div className="grid gap-3">
      {events.map((e) => {
        const { date, time } = formatEventStart(e.start_at);
        const location = formatLocation(e);
        return (
          <div
            key={e.id}
            className="rounded-2xl border bg-white px-4 py-3 shadow-sm shadow-slate-900/5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {e.title}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{date}</span>
                  {time ? <span> · {time} Uhr</span> : null}
                </div>
                {location ? (
                  <div className="mt-1 text-sm text-slate-600">{location}</div>
                ) : null}
              </div>
            </div>

            {e.ticket_url ? (
              <a
                href={e.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-blue-700 hover:underline"
              >
                Tickets / Infos →
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

