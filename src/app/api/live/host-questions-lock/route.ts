import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashLiveHostToken } from "@/lib/live/types";

/** Host: neue Fragen schließen oder wieder erlauben. Offene Fragen bleiben. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; closed?: boolean };
    const token = body.token?.trim();
    if (!token || typeof body.closed !== "boolean") {
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

    const questionsClosedAt = body.closed ? new Date().toISOString() : null;
    const { error } = await admin
      .from("live_sessions")
      .update({
        questions_closed_at: questionsClosedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (error) {
      if (/questions_closed_at/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              "Fragen lassen sich noch nicht schließen. Bitte supabase/166_live_session_questions_closed.sql im SQL-Editor ausführen.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, questionsClosed: body.closed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
