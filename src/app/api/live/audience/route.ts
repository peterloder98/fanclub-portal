import { NextResponse } from "next/server";
import { loadLiveSessionAudience } from "@/lib/live/audience";

export const dynamic = "force-dynamic";

/** Wer gerade im Live-Raum ist (Heartbeat-Anwesenheit, letzte ~90 s). */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt." }, { status: 400 });
  }
  const result = await loadLiveSessionAudience(sessionId);
  if (!result.ok) {
    const status =
      result.error === "Nicht angemeldet."
        ? 401
        : result.error.includes("nicht geöffnet")
          ? 403
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({
    count: result.count,
    members: result.members,
  });
}
