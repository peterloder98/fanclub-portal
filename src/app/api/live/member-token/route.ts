import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mintLiveKitToken } from "@/lib/live/livekit";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";
import { syncLiveSessionLifecycle } from "@/lib/live/cleanup";
import { profileDisplayName } from "@/lib/profiles/display";
import { assertMemberCanWrite, BROWSE_ONLY_WRITE_BLOCKED_MESSAGE } from "@/lib/portal-launch";

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
    try {
      assertMemberCanWrite(profile?.role ?? "member", Date.now(), user.id);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : BROWSE_ONLY_WRITE_BLOCKED_MESSAGE },
        { status: 403 },
      );
    }

    const admin = createSupabaseAdminClient();
    let { data: session, error } = await supabase
      .from("live_sessions")
      .select(
        "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at,grace_ends_at",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error && /grace_ends_at/i.test(error.message)) {
      const fallback = await supabase
        .from("live_sessions")
        .select(
          "id,slug,title,starts_at,ends_at,join_opens_at,status,host_token_hash,livekit_room_name,created_by,created_at,updated_at",
        )
        .eq("slug", slug)
        .maybeSingle();
      session = fallback.data
        ? ({ ...fallback.data, grace_ends_at: null } as typeof session)
        : null;
      error = fallback.error;
    }

    if (error || !session) {
      return NextResponse.json({ error: "Session nicht gefunden." }, { status: 404 });
    }

    const row = session as LiveSessionRow;
    const phase = await syncLiveSessionLifecycle(admin, row);
    if (phase !== "active") {
      return NextResponse.json(
        {
          error:
            phase === "grace"
              ? "Anni ist offline — nur noch der Chat ist kurz offen."
              : "Die Session ist zu Ende.",
        },
        { status: 403 },
      );
    }
    if (!canMembersJoinSession(row)) {
      return NextResponse.json(
        { error: "Diese Session ist gerade nicht geöffnet." },
        { status: 403 },
      );
    }

    const name = profile ? profileDisplayName(profile) : "Mitglied";

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
