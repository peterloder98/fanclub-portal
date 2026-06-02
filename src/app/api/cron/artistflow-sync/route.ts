import { NextResponse } from "next/server";
import { syncArtistflowEventsFromFeed } from "@/lib/artistflow/sync";

export async function GET(request: Request) {
  const u = new URL(request.url);
  const secret = u.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const feedUrl = process.env.ARTISTFLOW_FEED_URL;
  if (!feedUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing ARTISTFLOW_FEED_URL" },
      { status: 500 },
    );
  }

  try {
    const result = await syncArtistflowEventsFromFeed(feedUrl);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sync_failed" },
      { status: 500 },
    );
  }
}

