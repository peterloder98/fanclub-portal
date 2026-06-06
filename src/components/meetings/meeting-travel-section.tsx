import type { EventTravelInfo } from "@/lib/events/travel-info";
import { travelInfoHasContent } from "@/lib/events/travel-info";
import { formatWalkDistance, formatWalkDuration } from "@/lib/events/travel-info";

export function MeetingTravelSection({ travel }: { travel: EventTravelInfo }) {
  if (!travelInfoHasContent(travel)) return null;

  return (
    <section className="grid gap-3 rounded-2xl border border-fc-ice bg-fc-ice/40 p-4">
      <h2 className="text-sm font-semibold text-fc-navy">Anreise & Unterkunft</h2>
      {travel.station ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fc-sky">Anreise</p>
          <p className="mt-1 text-sm font-medium text-fc-navy">{travel.station.name}</p>
          {travel.station.address ? (
            <p className="text-sm text-[color:var(--muted)]">{travel.station.address}</p>
          ) : null}
          {travel.station.link ? (
            <a
              href={travel.station.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-medium text-fc-blue hover:underline"
            >
              Route planen
            </a>
          ) : null}
        </div>
      ) : null}
      {travel.hotels.length ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fc-sky">Hotels</p>
          <ul className="mt-2 grid gap-2">
            {travel.hotels.map((h, i) => (
              <li key={i} className="rounded-xl border bg-white px-3 py-2 text-sm">
                <p className="font-medium text-fc-navy">{h.name}</p>
                {h.address ? <p className="text-[color:var(--muted)]">{h.address}</p> : null}
                {h.distanceMeters || h.durationSeconds ? (
                  <p className="mt-0.5 text-xs text-fc-sky">
                    {[
                      formatWalkDistance(h.distanceMeters),
                      formatWalkDuration(h.durationSeconds),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {travel.notes ? (
        <p className="text-sm leading-relaxed text-[color:var(--muted)]">{travel.notes}</p>
      ) : null}
    </section>
  );
}
