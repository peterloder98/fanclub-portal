import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashLiveHostToken } from "@/lib/live/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; questionId?: string };
    const token = body.token?.trim();
    const questionId = body.questionId?.trim();
    if (!token || !questionId) {
      return NextResponse.json({ error: "Angaben fehlen." }, { status: 400 });
    }

    const hash = hashLiveHostToken(token);
    const admin = createSupabaseAdminClient();
    const { data: session } = await admin
      .from("live_sessions")
      .select("id")
      .eq("host_token_hash", hash)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Ungültiger Host-Link." }, { status: 404 });
    }

    const { error } = await admin
      .from("live_session_questions")
      .update({
        dismissed_at: new Date().toISOString(),
        dismissed_by: null,
      })
      .eq("id", questionId)
      .eq("session_id", session.id)
      .is("dismissed_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
