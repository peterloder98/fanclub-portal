import Link from "next/link";
import { HeartHandshake, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatEventCity } from "@/lib/events/format";
import { formatEur } from "@/lib/club/ledger";
import type { ClubMeetingListItem } from "@/lib/meetings/types";

export function MeetingsUpcomingSection({ meetings }: { meetings: ClubMeetingListItem[] }) {
  const upcoming = meetings.filter((m) => new Date(m.starts_at).getTime() >= Date.now());
  if (!upcoming.length) {
    return (
      <EmptyState>
        Aktuell sind keine Fanclub-Treffen geplant. Sobald ein Termin feststeht, erscheint er hier
        und im Dashboard.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-3">
      {upcoming.map((m) => (
        <MeetingCard key={m.id} meeting={m} />
      ))}
    </div>
  );
}

export function MeetingsArchiveSection({
  meetings,
  mediaByMeetingId,
}: {
  meetings: ClubMeetingListItem[];
  mediaByMeetingId: Record<
    string,
    Array<{ id: string; kind: string; caption: string | null; report_body: string | null }>
  >;
}) {
  const past = meetings.filter((m) => new Date(m.starts_at).getTime() < Date.now());
  if (!past.length) {
    return <p className="text-sm text-[color:var(--muted)]">Noch keine vergangenen Treffen.</p>;
  }

  return (
    <div className="grid gap-4">
      {past.map((m) => {
        const media = mediaByMeetingId[m.id] ?? [];
        const reports = media.filter((x) => x.kind === "report");
        return (
          <Card key={m.id} className="overflow-hidden">
            <CardContent className="p-4">
              <Link href={`/treffen/${m.id}`} className="block">
                <div className="flex flex-wrap items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-fc-blue" aria-hidden />
                  <h3 className="font-semibold text-fc-navy">{m.title}</h3>
                  <Badge variant="neutral">Archiv</Badge>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {new Date(m.starts_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </Link>
              {reports.length ? (
                <div className="mt-3 grid gap-2 border-t border-fc-ice pt-3">
                  {reports.map((r) => (
                    <div key={r.id} className="rounded-xl bg-fc-ice/50 px-3 py-2 text-sm text-fc-navy">
                      {r.report_body || r.caption}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-fc-sky">Nachbericht folgt in Kürze.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MeetingCard({ meeting: m }: { meeting: ClubMeetingListItem }) {
  const when = new Date(m.starts_at).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const location = [m.venue, formatEventCity({ city: m.city, country: m.country })]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="border-fc-sky/20 transition hover:shadow-md">
      <CardContent className="p-4">
        <Link href={`/treffen/${m.id}`} className="block">
          <div className="flex flex-wrap items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-fc-blue" aria-hidden />
            <h3 className="text-base font-semibold text-fc-navy">{m.title}</h3>
            {m.joined ? <Badge variant="success">Dabei</Badge> : null}
            {m.cost_cents ? (
              <Badge variant="brand">{formatEur(m.cost_cents)} p. P.</Badge>
            ) : null}
          </div>
          {m.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-[color:var(--muted)]">{m.summary}</p>
          ) : null}
          <p className="mt-2 text-sm font-medium text-fc-navy">{when}</p>
          {location ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-[color:var(--muted)]">
              <MapPin className="h-3.5 w-3.5 text-fc-sky" aria-hidden />
              {location}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-medium text-fc-blue">Details & Teilnahme →</p>
        </Link>
      </CardContent>
    </Card>
  );
}
