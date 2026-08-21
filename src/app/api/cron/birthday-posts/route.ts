import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBirthdayPosts } from "@/lib/birthday/run-birthday-posts";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Geburtstags-Gratulation als Feed-Post (Europe/Berlin-Tag).
 * Primär: 07:00 UTC · Safety: 11:00 UTC · zusätzlich Backup über meeting-reminders.
 * Idempotent: Unique-Index + Skip wenn Post für user+Tag schon existiert.
 */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("trigger")?.trim();
  const trigger =
    fromQuery ||
    (request.headers.get("x-vercel-cron") === "1" ? "vercel-cron" : "manual");

  const admin = createSupabaseAdminClient();
  const result = await runBirthdayPosts(admin, { trigger });
  return NextResponse.json({ ok: true, ...result });
}
