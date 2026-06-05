import { Hotel, Shield, Train } from "lucide-react";
import type { EventAdminNote } from "@/lib/events/admin-notes";

export function EventAdminInfoBlock({ note }: { note: EventAdminNote }) {
  if (!note.nextStation && !note.nextHotel && !note.notes) return null;

  return (
    <div className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/60 px-2.5 py-2 text-xs">
      <div className="mb-1 flex items-center gap-1 font-semibold text-amber-900">
        <Shield className="h-3 w-3" aria-hidden />
        Vorstand-Infos
      </div>
      <div className="grid gap-1 text-amber-950">
        {note.nextStation ? (
          <div className="flex items-start gap-1.5">
            <Train className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
            <span>
              <span className="font-medium">Bahnhof:</span> {note.nextStation}
            </span>
          </div>
        ) : null}
        {note.nextHotel ? (
          <div className="flex items-start gap-1.5">
            <Hotel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
            <span>
              <span className="font-medium">Hotel:</span> {note.nextHotel}
            </span>
          </div>
        ) : null}
        {note.notes ? (
          <p className="whitespace-pre-wrap text-amber-900/90">{note.notes}</p>
        ) : null}
      </div>
    </div>
  );
}
