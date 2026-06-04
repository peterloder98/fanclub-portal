import type { SupabaseClient } from "@supabase/supabase-js";
import { birthdayPostBody } from "@/lib/birthday/templates";

export function berlinTodayMd() {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${m}-${d}`;
}

export function berlinTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function birthdateMatchesToday(birthdate: string, todayMd: string) {
  const md = String(birthdate).slice(5, 10);
  return md === todayMd;
}

export async function runBirthdayPosts(admin: SupabaseClient) {
  const todayMd = berlinTodayMd();
  const todayIso = berlinTodayIsoDate();

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  const authorId = adminProfile?.id;
  if (!authorId) return { created: 0, reason: "no_admin" as const };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,birthdate")
    .not("birthdate", "is", null);

  const { data: activeMemberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const activeIds = new Set((activeMemberships ?? []).map((m) => m.user_id));

  let created = 0;
  let variant = 0;

  for (const p of profiles ?? []) {
    if (!activeIds.has(p.id) || !p.birthdate) continue;
    if (!birthdateMatchesToday(String(p.birthdate), todayMd)) continue;

    const { data: existing } = await admin
      .from("posts")
      .select("id")
      .eq("is_birthday", true)
      .eq("birthday_date", todayIso)
      .eq("birthday_user_id", p.id)
      .limit(1);
    if (existing?.length) continue;

    const { title, body } = birthdayPostBody(p.first_name ?? "Fan", variant++);
    const { error } = await admin.from("posts").insert({
      author_id: authorId,
      author_role: "anni",
      title,
      body,
      status: "approved",
      is_birthday: true,
      birthday_date: todayIso,
      birthday_user_id: p.id,
      last_activity_at: new Date().toISOString(),
    });
    if (!error) created += 1;
  }

  return { created, reason: "ok" as const };
}
