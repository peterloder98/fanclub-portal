import {
  markGroupChatLastSeen,
} from "@/app/(app)/chat/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SEEN_KEY = "fc-group-chat-last-seen";

function maxIso(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b;
}

export function readChatLastSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function writeChatLastSeen(iso: string) {
  try {
    const prev = localStorage.getItem(SEEN_KEY);
    const next = maxIso(prev, iso) ?? iso;
    localStorage.setItem(SEEN_KEY, next);
  } catch {
    /* ignore */
  }
}

/** Lokal + Server: Lesestatus auf neuesten Zeitstempel setzen. */
export async function markChatSeenFromMessages(
  messages: Array<{ created_at: string }>,
): Promise<string> {
  const newest = messages.length
    ? messages.reduce(
        (max, m) => (m.created_at > max ? m.created_at : max),
        messages[0].created_at,
      )
    : new Date().toISOString();

  writeChatLastSeen(newest);
  const remote = await markGroupChatLastSeen(newest).catch(() => null);
  const merged = maxIso(newest, remote) ?? newest;
  writeChatLastSeen(merged);
  return merged;
}

/**
 * Lesestatus von allen Geräten laden (DB + localStorage).
 * Direkt über Browser→Supabase — kein Vercel Server Action / Active CPU.
 * Falls die DB-Spalte noch fehlt: nur localStorage.
 */
export async function syncChatLastSeenFromServer(): Promise<string | null> {
  const local = readChatLastSeen();
  try {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return local;

    const { data, error } = await supabase
      .from("profiles")
      .select("group_chat_last_seen_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      if (/group_chat_last_seen_at|does not exist/i.test(error.message)) return local;
      console.error("[chat] fetch last seen:", error.message);
      return local;
    }

    const remote =
      (data as { group_chat_last_seen_at?: string | null } | null)?.group_chat_last_seen_at ??
      null;
    const merged = maxIso(local, remote);
    if (merged) writeChatLastSeen(merged);
    return merged;
  } catch {
    return local;
  }
}
