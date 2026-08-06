import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mintLiveKitToken } from "@/lib/live/livekit";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";
import { endLiveSessionIfPast } from "@/lib/live/cleanup";
import { profileDisplayName } from "@/lib/profiles/display";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = body.slug?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Slug fehlt." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const [{ data: membership }, { data: profile }] = await Promise.all([
      supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("id,first_name,last_name,email,role").eq("id", user.id).maybeSingle(),
    ]);
    if (!membership && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Nur aktive Mitglieder können dem Live beitreten." },
        { status: 403 },
      );
    }

    const { data: session, error } = await supabase
      .from("live_sessions")
      .select(
        "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Session nicht gefunden." }, { status: 404 });
    }

    const row = session as LiveSessionRow;
    if (await endLiveSessionIfPast(createSupabaseAdminClient(), row)) {
      return NextResponse.json({ error: "Die Session ist zu Ende." }, { status: 403 });
    }
    if (!canMembersJoinSession(row)) {
      return NextResponse.json(
        { error: "Diese Session ist gerade nicht geöffnet." },
        { status: 403 },
      );
    }

    const name = profile
      ? profileDisplayName(profile)
      : "Mitglied";

    const { token, url } = await mintLiveKitToken({
      roomName: row.livekit_room_name,
      identity: `user:${user.id}`,
      name,
      canPublish: false,
    });

    return NextResponse.json({
      token,
      url,
      roomName: row.livekit_room_name,
      sessionId: row.id,
      title: row.title,
      status: row.status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
