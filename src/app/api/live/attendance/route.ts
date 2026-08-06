import { NextResponse } from "next/server";
import { pingLiveSessionAttendance } from "@/lib/live/attendance";

export const dynamic = "force-dynamic";

/** Heartbeat: Anwesenheit im Live-Raum; ab 1 Minute → +2 Anni-Stars (einmal pro Session). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
    }
    const result = await pingLiveSessionAttendance(sessionId);
    if (!result.ok) {
      const status =
        result.error === "Nicht angemeldet."
          ? 401
          : result.error.includes("nicht geöffnet")
            ? 403
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
