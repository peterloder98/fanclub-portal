"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertLiveSessionDuration,
  generateLiveHostToken,
  liveHostUrl,
  liveKitRoomNameForSession,
  slugifyLiveTitle,
  type LiveSessionStatus,
} from "@/lib/live/types";
import { sendLiveSessionInviteEmails } from "@/lib/live/invites";

function parseIso(label: string, raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`${label}: ungültiges Datum.`);
  return d.toISOString();
}

export async function createLiveSessionAction(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  joinOpensAt: string;
  sendInvites?: boolean;
}): Promise<
  | {
      ok: true;
      id: string;
      slug: string;
      hostUrl: string;
      inviteEmails?: number;
      inviteErrors?: number;
    }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requireAdminAction();
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      return { ok: false, error: "Titel: 2–120 Zeichen." };
    }

    const starts_at = parseIso("Start", input.startsAt);
    const ends_at = parseIso("Ende", input.endsAt);
    const join_opens_at = parseIso("Beitritt ab", input.joinOpensAt);
    if (new Date(join_opens_at) > new Date(starts_at)) {
      return { ok: false, error: "Beitritt muss vor oder zum Start liegen." };
    }
    try {
      assertLiveSessionDuration(starts_at, ends_at);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Ungültige Dauer." };
    }

    const { token, hash } = generateLiveHostToken();
    const slug = slugifyLiveTitle(title);
    const id = crypto.randomUUID();
    const livekit_room_name = liveKitRoomNameForSession(id);
    const admin = createSupabaseAdminClient();

    const { error } = await admin.from("live_sessions").insert({
      id,
      slug,
      title,
      starts_at,
      ends_at,
      join_opens_at,
      status: "scheduled" satisfies LiveSessionStatus,
      host_token_hash: hash,
      livekit_room_name,
      created_by: user.id,
    });
    if (error) return { ok: false, error: error.message };

    let inviteEmails = 0;
    let inviteErrors = 0;
    if (input.sendInvites !== false) {
      try {
        const inv = await sendLiveSessionInviteEmails({
          id,
          slug,
          title,
          starts_at,
        });
        inviteEmails = inv.emails;
        inviteErrors = inv.errors;
      } catch (e) {
        console.error("[live] invite send failed", e);
        inviteErrors = 1;
      }
    }

    revalidatePath("/admin/live");
    revalidatePath("/live");
    revalidatePath("/dashboard");
    return {
      ok: true,
      id,
      slug,
      hostUrl: liveHostUrl(token),
      inviteEmails,
      inviteErrors,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler." };
  }
}

export async function resendLiveSessionInvitesAction(
  sessionId: string,
): Promise<
  | { ok: true; emails: number; errors: number }
  | { ok: false; error: string }
> {
  try {
    await requireAdminAction();
    const admin = createSupabaseAdminClient();
    const { data: session, error } = await admin
      .from("live_sessions")
      .select("id,slug,title,starts_at,status")
      .eq("id", sessionId)
      .maybeSingle();
    if (error || !session) return { ok: false, error: "Session nicht gefunden." };
    if (session.status === "ended" || session.status === "cancelled") {
      return { ok: false, error: "Beendete Sessions können nicht erneut eingeladen werden." };
    }
    const inv = await sendLiveSessionInviteEmails(session);
    revalidatePath("/admin/live");
    return { ok: true, emails: inv.emails, errors: inv.errors };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler." };
  }
}

export async function regenerateLiveHostTokenAction(
  sessionId: string,
): Promise<{ ok: true; hostUrl: string } | { ok: false; error: string }> {
  try {
    await requireAdminAction();
    const { token, hash } = generateLiveHostToken();
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("live_sessions")
      .update({ host_token_hash: hash, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/live");
    return { ok: true, hostUrl: liveHostUrl(token) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler." };
  }
}

export async function setLiveSessionStatusAction(
  sessionId: string,
  status: LiveSessionStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminAction();
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("live_sessions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/live");
    revalidatePath("/dashboard");
    revalidatePath("/live");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler." };
  }
}

export async function updateLiveSessionAction(input: {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  joinOpensAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminAction();
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      return { ok: false, error: "Titel: 2–120 Zeichen." };
    }
    const starts_at = parseIso("Start", input.startsAt);
    const ends_at = parseIso("Ende", input.endsAt);
    const join_opens_at = parseIso("Beitritt ab", input.joinOpensAt);
    if (new Date(join_opens_at) > new Date(starts_at)) {
      return { ok: false, error: "Beitritt muss vor oder zum Start liegen." };
    }
    try {
      assertLiveSessionDuration(starts_at, ends_at);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Ungültige Dauer." };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("live_sessions")
      .update({
        title,
        starts_at,
        ends_at,
        join_opens_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/live");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fehler." };
  }
}
