import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { beginLiveSessionGrace } from "@/lib/live/cleanup";
import { hashLiveHostToken, type LiveSessionRow } from "@/lib/live/types";

/** Host beendet vorzeitig (Verabschiedung) → Video aus, 10-Min-Chat-Nachlauf. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }

    const hash = hashLiveHostToken(token);
    const admin = createSupabaseAdminClient();
    const { data: session, error } = await admin
      .from("live_sessions")
      .select(
        "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at",
      )
      .eq("host_token_hash", hash)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Ungültiger Host-Link." }, { status: 404 });
    }

    const row = session as LiveSessionRow;
    if (row.status === "ended") {
      return NextResponse.json({
        ok: true,
        graceEndsAt: row.grace_ends_at,
        alreadyEnded: true,
      });
    }
    if (row.status === "cancelled") {
      return NextResponse.json({ error: "Session ist abgesagt." }, { status: 403 });
    }

    const graceEndsAt = await beginLiveSessionGrace(admin, row.id);
    return NextResponse.json({ ok: true, graceEndsAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
