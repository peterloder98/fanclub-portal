import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canMembersJoinSession, type LiveSessionRow } from "@/lib/live/types";

/** Offene Sessions für Nav/Dashboard (auth optional via cookies when called from app). */
export async function GET() {
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
