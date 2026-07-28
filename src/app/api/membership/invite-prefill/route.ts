import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Öffentlich: Einladungsdaten für vorausgefüllten Antrag (nur per Token). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("membership_referral_sends")
    .select(
      "sender_id,recipient_email,recipient_first_name,recipient_last_name,recipient_gender",
    )
    .eq("referral_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const gender = row.recipient_gender?.trim();
  const normalizedGender = gender === "m" || gender === "w" ? gender : null;

  return NextResponse.json({
    ok: true,
    referrerUserId: row.sender_id,
    email: row.recipient_email?.trim() ?? "",
    firstName: row.recipient_first_name?.trim() ?? "",
    lastName: row.recipient_last_name?.trim() ?? "",
    gender: normalizedGender,
  });
}
