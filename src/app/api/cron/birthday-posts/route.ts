import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBirthdayPosts } from "@/lib/birthday/run-birthday-posts";
import { authorizeCronRequest } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";

/** Täglich 08:00 Europe/Berlin: Geburtstags-Gratulation als Feed-Post. */
export async function GET(request: Request) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runBirthdayPosts(admin);
  return NextResponse.json({ ok: true, ...result });
}
