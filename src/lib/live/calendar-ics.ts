import { buildEventIcs } from "@/lib/calendar/build-ics";
import {
  LIVE_CALENDAR_EARLY_MINUTES,
  LIVE_CALENDAR_TITLE,
} from "@/lib/live/anni-recipient";
import { liveMemberUrl } from "@/lib/live/types";

/** .ics für Live-Einladung/Erinnerung: Start 5 Min früher, Alarme 1 Tag + 1 Std. */
export function buildLiveSessionIcs(session: {
  id: string;
  slug: string;
  starts_at: string;
  ends_at: string;
}): string {
  const startMs = new Date(session.starts_at).getTime();
  const calendarStart = new Date(
    startMs - LIVE_CALENDAR_EARLY_MINUTES * 60_000,
  ).toISOString();
  const url = liveMemberUrl(session.slug);

  return buildEventIcs({
    title: LIVE_CALENDAR_TITLE,
    startAt: calendarStart,
    endAt: session.ends_at,
    description: [
      "Live mit Anni in der Fanclub-App — Fan-Chat.",
      `Bitte etwas früher einloggen (Kalenderstart ${LIVE_CALENDAR_EARLY_MINUTES} Minuten vor Beginn).`,
      url ? `Link: ${url}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    uid: `live-session-${session.id}@anni-perka-fanclub`,
    alarms: [
      {
        trigger: "-P1D",
        description: `Erinnerung: ${LIVE_CALENDAR_TITLE} (morgen)`,
      },
      {
        trigger: "-PT1H",
        description: `Erinnerung: ${LIVE_CALENDAR_TITLE} in 1 Stunde`,
      },
    ],
  });
}

export function liveSessionIcsAttachment(session: {
  id: string;
  slug: string;
  starts_at: string;
  ends_at: string;
}) {
  return {
    filename: "anni-perka-live-chat.ics",
    content: Buffer.from(buildLiveSessionIcs(session), "utf8"),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };
}
