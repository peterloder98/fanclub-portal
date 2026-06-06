import type { SupabaseClient } from "@supabase/supabase-js";
import { birthdayPostBodyAsync } from "@/lib/birthday/templates";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

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

  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,birthdate,gender")
    .not("birthdate", "is", null);

  const { data: activeMemberships } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  const activeIds = new Set((activeMemberships ?? []).map((m) => m.user_id));

  let created = 0;

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

    const { title, body } = await birthdayPostBodyAsync(
      p.first_name ?? "Fan",
      p.gender,
      p.id,
      todayIso,
    );
    const { data: inserted, error } = await admin
      .from("posts")
      .insert({
        author_id: null,
        author_role: "anni",
        title,
        body,
        status: "approved",
        is_birthday: true,
        birthday_date: todayIso,
        birthday_user_id: p.id,
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (!error && inserted?.id) {
      created += 1;
      const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
        /\/$/,
        "",
      );
      await createUserNotification({
        userId: p.id,
        kind: NOTIFICATION_KINDS.birthdayPost,
        title: "Alles Gute zum Geburtstag!",
        body: "Im Feed wartet deine Geburtstagsgratulation von Anni.",
        linkUrl: base
          ? `${base}/dashboard?post=${inserted.id}`
          : `/dashboard?post=${inserted.id}`,
        linkLabel: "Zum Post",
        metadata: { post_id: inserted.id, dedupe_key: `birthday:${todayIso}` },
      }).catch(console.error);
    }
  }

  return { created, reason: "ok" as const };
}
