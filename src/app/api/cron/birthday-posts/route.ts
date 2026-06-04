import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runBirthdayPosts } from "@/lib/birthday/run-birthday-posts";

export const dynamic = "force-dynamic";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Täglich 08:00 Europe/Berlin: Geburtstags-Gratulation als Feed-Post. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await runBirthdayPosts(admin);
  return NextResponse.json({ ok: true, ...result });
}
