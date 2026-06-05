import { NextResponse } from "next/server";
import { syncArtistflowEventsFromFeed } from "@/lib/artistflow/sync";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { notifyAllAdmins } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
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
    const msg = e instanceof Error ? e.message : "sync_failed";
    await notifyAllAdmins({
      kind: NOTIFICATION_KINDS.eventSyncFailed,
      title: "Event-Sync fehlgeschlagen",
      body: msg,
      linkUrl: "/events",
      linkLabel: "Events",
      metadata: { error: msg },
    }).catch(console.error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

