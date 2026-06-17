import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordRadioVotingParticipation } from "@/lib/votings/record-radio-participation";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const campaignId =
    typeof body === "object" && body && "campaignId" in body
      ? String((body as { campaignId: unknown }).campaignId)
      : "";
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const result = await recordRadioVotingParticipation(user.id, campaignId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    alreadyParticipated: result.alreadyParticipated,
    starsAwarded: result.starsAwarded,
  });
}
