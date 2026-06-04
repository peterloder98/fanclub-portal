import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizePreferredCalendar, type PreferredCalendar } from "@/lib/calendar/preferred-calendar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_calendar")
    .eq("id", user.id)
    .maybeSingle();

  const preference = normalizePreferredCalendar(profile?.preferred_calendar);
  return NextResponse.json({ preference });
}

const bodySchema = z.object({
  preference: z.enum(["ask", "google", "outlook", "ics"]),
});

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let preference: PreferredCalendar;
  try {
    const json = await req.json();
    preference = bodySchema.parse(json).preference;
  } catch {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_calendar: preference })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preference });
}
