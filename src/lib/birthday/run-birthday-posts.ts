import type { SupabaseClient } from "@supabase/supabase-js";
import { birthdayPostBodyAsync } from "@/lib/birthday/templates";
import { createUserNotification } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import { isHiddenProfileId } from "@/lib/members/hidden";

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

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key|unique constraint|posts_birthday_user_day_unique/i.test(
    error.message ?? "",
  );
}

export type BirthdayPostsRunResult = {
  created: number;
  skippedExisting: number;
  candidates: number;
  todayIso: string;
  todayMd: string;
  reason: "ok";
  trigger?: string;
  errors: string[];
};

export async function runBirthdayPosts(
  admin: SupabaseClient,
  opts?: { trigger?: string },
): Promise<BirthdayPostsRunResult> {
  const trigger = opts?.trigger?.trim() || "unknown";
  const todayMd = berlinTodayMd();
  const todayIso = berlinTodayIsoDate();
  const errors: string[] = [];

  console.info("[birthday-posts] start", { trigger, todayIso, todayMd });

  const full = await admin
    .from("profiles")
    .select("id,first_name,last_name,birthdate,gender,no_app_access")
    .not("birthdate", "is", null);
  let profiles = full.data;
  if (full.error && /no_app_access|does not exist/i.test(full.error.message)) {
    const fb = await admin
      .from("profiles")
      .select("id,first_name,last_name,birthdate,gender")
      .not("birthdate", "is", null);
    profiles = (fb.data ?? null) as typeof profiles;
  } else if (full.error) {
    console.error("[birthday-posts] profiles query failed", full.error.message);
    errors.push(`profiles: ${full.error.message}`);
  }

  const { data: activeMemberships, error: membershipError } = await admin
    .from("memberships")
    .select("user_id")
    .eq("status", "active");
  if (membershipError) {
    console.error("[birthday-posts] memberships query failed", membershipError.message);
    errors.push(`memberships: ${membershipError.message}`);
  }
  const activeIds = new Set((activeMemberships ?? []).map((m) => m.user_id));

  let created = 0;
  let skippedExisting = 0;
  let candidates = 0;

  for (const p of profiles ?? []) {
    if (isHiddenProfileId(p.id)) continue;
    if ((p as { no_app_access?: boolean | null }).no_app_access) continue;
    if (!activeIds.has(p.id) || !p.birthdate) continue;
    if (!birthdateMatchesToday(String(p.birthdate), todayMd)) continue;

    candidates += 1;

    const { data: existing } = await admin
      .from("posts")
      .select("id")
      .eq("is_birthday", true)
      .eq("birthday_date", todayIso)
      .eq("birthday_user_id", p.id)
      .limit(1);
    if (existing?.length) {
      skippedExisting += 1;
      console.info("[birthday-posts] skip existing", {
        trigger,
        userId: p.id,
        firstName: p.first_name,
        postId: existing[0]?.id,
      });
      continue;
    }

    const displayName =
      p.first_name && p.last_name
        ? `${p.first_name} ${p.last_name}`
        : (p.first_name ?? "Fan");
    const { title, body } = await birthdayPostBodyAsync(
      p.first_name ?? "Fan",
      p.gender,
      p.id,
      todayIso,
      displayName,
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

    if (isUniqueViolation(error)) {
      skippedExisting += 1;
      console.info("[birthday-posts] skip race (unique)", {
        trigger,
        userId: p.id,
        firstName: p.first_name,
      });
      continue;
    }

    if (error || !inserted?.id) {
      const msg = error?.message ?? "insert returned no id";
      console.error("[birthday-posts] insert failed", {
        trigger,
        userId: p.id,
        firstName: p.first_name,
        message: msg,
      });
      errors.push(`${p.id}: ${msg}`);
      continue;
    }

    created += 1;
    console.info("[birthday-posts] created", {
      trigger,
      userId: p.id,
      firstName: p.first_name,
      postId: inserted.id,
    });

    const base = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
      /\/$/,
      "",
    );
    await createUserNotification({
      userId: p.id,
      kind: NOTIFICATION_KINDS.birthdayPost,
      title: "Alles Gute zum Geburtstag!",
      body: "Im Feed wartet deine Geburtstagsgratulation von Anni.",
      linkUrl: base ? `${base}/dashboard?post=${inserted.id}` : `/dashboard?post=${inserted.id}`,
      linkLabel: "Zum Post",
      metadata: { post_id: inserted.id, dedupe_key: `birthday:${todayIso}` },
    }).catch((err) => {
      console.error("[birthday-posts] notification failed", {
        trigger,
        userId: p.id,
        postId: inserted.id,
        err,
      });
    });
  }

  const result: BirthdayPostsRunResult = {
    created,
    skippedExisting,
    candidates,
    todayIso,
    todayMd,
    reason: "ok",
    trigger,
    errors,
  };
  console.info("[birthday-posts] done", result);
  return result;
}
