import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildLiveSessionIcs } from "@/lib/live/calendar-ics";

export const dynamic = "force-dynamic";

/**
 * Öffentlicher .ics-Download für Live-Mails („In den Kalender eintragen“).
 * Query: id, slug, starts_at, ends_at — oder nur slug (DB-Lookup).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.trim() ?? "";
    let id = searchParams.get("id")?.trim() ?? "";
    let starts_at = searchParams.get("starts_at")?.trim() ?? "";
    let ends_at = searchParams.get("ends_at")?.trim() ?? "";

    if ((!id || !starts_at || !ends_at) && slug) {
      const admin = createSupabaseAdminClient();
      const { data } = await admin
        .from("live_sessions")
        .select("id,slug,starts_at,ends_at")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        id = data.id;
        starts_at = data.starts_at;
        ends_at = data.ends_at;
      }
    }

    if (!id || !slug || !starts_at || !ends_at) {
      return NextResponse.json({ error: "Kalenderdaten fehlen." }, { status: 400 });
    }
    if (Number.isNaN(new Date(starts_at).getTime()) || Number.isNaN(new Date(ends_at).getTime())) {
      return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
    }

    const ics = buildLiveSessionIcs({ id, slug, starts_at, ends_at });
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="anni-perka-live-chat.ics"',
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler." },
      { status: 500 },
    );
  }
}
