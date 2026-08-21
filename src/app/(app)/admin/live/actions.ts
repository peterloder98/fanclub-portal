"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  endsAtFromDuration,
  generateLiveHostToken,
  liveHostUrl,
  liveKitRoomNameForSession,
  slugifyLiveTitle,
  type LiveSessionStatus,
} from "@/lib/live/types";
import {
  sendAnniHostLinkEmail,
  sendLiveSessionInviteEmails,
} from "@/lib/live/invites";
import { berlinWallClockToUtcIso } from "@/lib/datetime/berlin";

/**
 * Admin-Eingabe = Europe/Berlin-Wanduhr (`YYYY-MM-DDTHH:mm`) oder bereits ISO mit Offset/Z.
 * Speichert immer als UTC-Instant.
 */
function parseAdminDateTime(label: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error(`${label}: ungültiges Datum.`);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    try {
      return berlinWallClockToUtcIso(trimmed);
    } catch {
      throw new Error(`${label}: ungültiges Datum.`);
    }
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error(`${label}: ungültiges Datum.`);
  return d.toISOString();
}

export async function createLiveSessionAction(input: {
  title: string;
  startsAt: string;
  /** Geplante Dauer in Minuten; Ende = Start + Dauer. */
  durationMinutes: number;
  joinOpensAt: string;
  sendInvites?: boolean;
}): Promise<
  | {
      ok: true;
      id: string;
      slug: string;
      hostUrl: string;
      /** Einladungen laufen im Hintergrund — Zähler erst nach Versand bekannt. */
      invitesQueued: boolean;
    }
  | { ok: false; error: string }
> {
  try {
    const { user } = await requireAdminAction();
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      return { ok: false, error: "Titel: 2–120 Zeichen." };
    }

    const starts_at = parseAdminDateTime("Start", input.startsAt);
    let ends_at: string;
    try {
      ends_at = endsAtFromDuration(starts_at, input.durationMinutes);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Ungültige Dauer." };
    }
    const join_opens_at = parseAdminDateTime("Beitritt ab", input.joinOpensAt);
    if (new Date(join_opens_at) > new Date(starts_at)) {
      return { ok: false, error: "Beitritt muss vor oder zum Start liegen." };
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

    const hostUrl = liveHostUrl(token);
    const sessionMail = { id, slug, title, starts_at, ends_at, join_opens_at };
    const queueInvites = input.sendInvites !== false;

    after(async () => {
      try {
        const hostMail = await sendAnniHostLinkEmail({ session: sessionMail, hostUrl });
        if (!hostMail.ok) {
          console.error("[live] Anni host email not delivered", id);
        }
      } catch (e) {
        console.error("[live] Anni host email failed", e);
      }
      if (queueInvites) {
        try {
          const inv = await sendLiveSessionInviteEmails(sessionMail);
          if (inv.errors > 0) {
            console.error("[live] invite send partial errors", {
              id,
              emails: inv.emails,
              errors: inv.errors,
            });
          }
        } catch (e) {
          console.error("[live] invite send failed", e);
        }
      }
    });

    revalidatePath("/admin/live");
    revalidatePath("/live");
    revalidatePath("/dashboard");
    return {
      ok: true,
      id,
      slug,
      hostUrl,
      invitesQueued: queueInvites,
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
    const { data, error } = await admin
      .from("live_sessions")
      .select("id,slug,title,starts_at,ends_at,join_opens_at,status")
      .eq("id", sessionId)
      .maybeSingle();
    if (error || !data) return { ok: false, error: "Session nicht gefunden." };
    if (data.status === "ended" || data.status === "cancelled") {
      return { ok: false, error: "Beendete Sessions können nicht erneut eingeladen werden." };
    }
    const inv = await sendLiveSessionInviteEmails(data);
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
    const { data: session, error: fetchErr } = await admin
      .from("live_sessions")
      .select("id,slug,title,starts_at,ends_at,status")
      .eq("id", sessionId)
      .maybeSingle();
    if (fetchErr || !session) return { ok: false, error: "Session nicht gefunden." };
    if (session.status === "ended" || session.status === "cancelled") {
      return { ok: false, error: "Beendete Sessions: Host-Link kann nicht erneuert werden." };
    }

    const { error } = await admin
      .from("live_sessions")
      .update({ host_token_hash: hash, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) return { ok: false, error: error.message };

    const hostUrl = liveHostUrl(token);
    after(async () => {
      try {
        const hostMail = await sendAnniHostLinkEmail({ session, hostUrl });
        if (!hostMail.ok) {
          console.error("[live] Anni host email (regen) not delivered", sessionId);
        }
      } catch (e) {
        console.error("[live] Anni host email (regen) failed", e);
      }
    });

    revalidatePath("/admin/live");
    return { ok: true, hostUrl };
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
    if (status === "ended") {
      const { beginLiveSessionGrace } = await import("@/lib/live/cleanup");
      await beginLiveSessionGrace(admin, sessionId);
    } else if (status === "cancelled") {
      const { data: row } = await admin
        .from("live_sessions")
        .select("livekit_room_name")
        .eq("id", sessionId)
        .maybeSingle();
      const { error } = await admin.from("live_sessions").delete().eq("id", sessionId);
      if (error) return { ok: false, error: error.message };
      if (row?.livekit_room_name) {
        const { deleteLiveKitRoom } = await import("@/lib/live/livekit");
        void deleteLiveKitRoom(row.livekit_room_name);
      }
    } else {
      const { error } = await admin
        .from("live_sessions")
        .update({ status, updated_at: new Date().toISOString(), grace_ends_at: null })
        .eq("id", sessionId);
      if (error) return { ok: false, error: error.message };
    }
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
  durationMinutes: number;
  joinOpensAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdminAction();
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      return { ok: false, error: "Titel: 2–120 Zeichen." };
    }
    const starts_at = parseAdminDateTime("Start", input.startsAt);
    let ends_at: string;
    try {
      ends_at = endsAtFromDuration(starts_at, input.durationMinutes);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Ungültige Dauer." };
    }
    const join_opens_at = parseAdminDateTime("Beitritt ab", input.joinOpensAt);
    if (new Date(join_opens_at) > new Date(starts_at)) {
      return { ok: false, error: "Beitritt muss vor oder zum Start liegen." };
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
