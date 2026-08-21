import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";

/** Offene Sessions für Nav/Dashboard — nur angemeldete Mitglieder/Admins. */
export async function GET() {
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
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!membership && profile?.role !== "admin") {
    return NextResponse.json({ error: "Nur aktive Mitglieder." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("live_sessions")
    .select("id,slug,title,starts_at,ends_at,join_opens_at,status")
    .in("status", ["scheduled", "live"])
    .lte("join_opens_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: true })
    .limit(5);

  const sessions = ((data ?? []) as LiveSessionRow[]).filter((s) => canMembersJoinSession(s));

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      startsAt: s.starts_at,
      status: s.status,
    })),
  });
}
