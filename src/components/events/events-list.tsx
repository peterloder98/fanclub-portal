import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEventStart, formatLocation } from "@/lib/events/format";
import { ticketDisplay } from "@/lib/events/ticket";

export type ExternalEventRow = {
  id: string;
  kind?: string | null;
  title: string;
  start_at: string | null;
  venue: string | null;
  city: string | null;
  country?: string | null;
  broadcaster?: string | null;
  address: string | null;
  postal_code?: string | null;
  ticket_url: string | null;
};

function EventCard({
  event,
  highlight,
}: {
  event: ExternalEventRow;
  highlight?: boolean;
}) {
  const { date, time } = formatEventStart(event.start_at);
  const location = formatLocation(event);
  const ticket = ticketDisplay(event.ticket_url);

  return (
    <Card className={highlight ? "border-blue-200 bg-blue-50/40" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{event.title}</CardTitle>
          {highlight ? <Badge variant="brand">Nächstes Konzert</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-slate-700">
        <div>
          <span className="font-medium text-slate-900">{date}</span>
          {time ? <span className="text-slate-600"> · {time} Uhr</span> : null}
        </div>
        {location ? <div>{location}</div> : null}
        {ticket.href ? (
          <a
            href={ticket.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit text-sm font-medium text-blue-700 hover:underline"
          >
            Tickets / Infos →
          </a>
        ) : ticket.text ? (
          <p className="text-sm font-medium text-slate-700">{ticket.text}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EventsList({
  events,
  isAdmin,
}: {
  events: ExternalEventRow[];
  isAdmin: boolean;
}) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Noch keine Events</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600">
          <p>
            Die Terminliste wird aus Artistflow synchronisiert. Sobald ein Sync
            gelaufen ist, erscheinen hier die Konzerte.
          </p>
          {isAdmin ? (
            <p>
              Als Admin:{" "}
              <Link href="/admin/events-sync" className="font-medium text-blue-700 hover:underline">
                Events Sync
              </Link>{" "}
              öffnen und „Sync starten“. Vorher{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">ARTISTFLOW_FEED_URL</code>{" "}
              in <code className="rounded bg-slate-100 px-1 text-xs">.env.local</code> setzen
              und SQL <code className="rounded bg-slate-100 px-1 text-xs">006_artistflow_events.sql</code>{" "}
              in Supabase ausführen.
            </p>
          ) : (
            <p>Die Termine werden vom Team gepflegt – schau später noch einmal vorbei.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const now = Date.now();
  const upcoming = events.filter(
    (e) => !e.start_at || new Date(e.start_at).getTime() >= now - 12 * 60 * 60 * 1000,
  );
  const past = events.filter(
    (e) => e.start_at && new Date(e.start_at).getTime() < now - 12 * 60 * 60 * 1000,
  );

  const next = upcoming[0];

  return (
    <div className="grid gap-4">
      {next ? <EventCard event={next} highlight /> : null}

      {upcoming.length > (next ? 1 : 0) ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Weitere Termine</h2>
          {upcoming.slice(next ? 1 : 0).map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-slate-600">Vergangene Termine</h2>
          {past.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
