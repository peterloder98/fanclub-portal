import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashLiveHostToken, type LiveSessionRow } from "@/lib/live/types";
import { profileDisplayName } from "@/lib/profiles/display";

async function sessionFromHostToken(token: string): Promise<LiveSessionRow | null> {
  const hash = hashLiveHostToken(token);
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("live_sessions")
    .select(
      "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
    )
    .eq("host_token_hash", hash)
    .maybeSingle();
  return (data as LiveSessionRow | null) ?? null;
}

/** Host: offene Fragen + letzte Chat-Nachrichten (Polling). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      afterMessageAt?: string | null;
    };
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }

    const session = await sessionFromHostToken(token);
    if (!session) {
      return NextResponse.json({ error: "Ungültiger Host-Link." }, { status: 404 });
    }

    const admin = createSupabaseAdminClient();

    const [{ data: questions }, { data: messages }] = await Promise.all([
      admin
        .from("live_session_questions")
        .select("id,body,created_at,author_id")
        .eq("session_id", session.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: true })
        .limit(100),
      admin
        .from("live_session_messages")
        .select("id,body,created_at,author_id")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    const authorIds = [
      ...new Set([
        ...(questions ?? []).map((q) => q.author_id),
        ...(messages ?? []).map((m) => m.author_id),
      ]),
    ];

    const { data: profiles } = authorIds.length
      ? await admin
          .from("profiles")
          .select("id,first_name,last_name,email")
          .in("id", authorIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> };

    const nameById = new Map(
      (profiles ?? []).map((p) => [
        p.id,
        profileDisplayName({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
        }),
      ]),
    );

    return NextResponse.json({
      sessionId: session.id,
      title: session.title,
      status: session.status,
      questions: (questions ?? []).map((q) => ({
        id: q.id,
        body: q.body,
        createdAt: q.created_at,
        authorName: nameById.get(q.author_id) ?? "Mitglied",
      })),
      messages: (messages ?? [])
        .slice()
        .reverse()
        .map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.created_at,
          authorName: nameById.get(m.author_id) ?? "Mitglied",
        })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
