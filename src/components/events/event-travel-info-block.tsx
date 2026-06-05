import { ExternalLink, Hotel, MapPin, Train } from "lucide-react";
import {
  formatDrivingDistance,
  travelInfoHasContent,
  type EventTravelInfo,
} from "@/lib/events/travel-info";

function PlaceRow({
  icon: Icon,
  label,
  place,
  showLink,
}: {
  icon: typeof Train;
  label: string;
  place: { name: string; address: string; link?: string | null; distanceMeters?: number | null };
  showLink?: boolean;
}) {
  const dist = formatDrivingDistance(place.distanceMeters);
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2">
      <div className="flex items-start gap-1.5">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{place.name || label}</p>
          {place.address ? (
            <p className="mt-0.5 flex items-start gap-1 text-slate-600">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-60" aria-hidden />
              <span>{place.address}</span>
            </p>
          ) : null}
          {dist ? (
            <p className="mt-1 text-[11px] font-medium text-blue-800">
              ≈ {dist} mit dem Auto zur Location
            </p>
          ) : null}
          {showLink && place.link ? (
            <a
              href={place.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Hotel-Infos
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EventTravelInfoBlock({ travel }: { travel: EventTravelInfo }) {
  if (!travelInfoHasContent(travel)) return null;

  return (
    <div className="mt-2 grid gap-1.5 text-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Anreise & Übernachtung
      </p>
      {travel.station ? (
        <PlaceRow icon={Train} label="Bahnhof" place={travel.station} />
      ) : null}
      {travel.hotels.map((h, i) => (
        <PlaceRow key={`${h.name}-${i}`} icon={Hotel} label={`Hotel ${i + 1}`} place={h} showLink />
      ))}
      {travel.notes ? (
        <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-2.5 py-2 text-slate-700">
          {travel.notes}
        </p>
      ) : null}
    </div>
  );
}
