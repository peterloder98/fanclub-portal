import {
  fetchGroupChatLastSeen,
  markGroupChatLastSeen,
} from "@/app/(app)/chat/actions";

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
 * Falls die DB-Spalte noch fehlt: nur localStorage.
 */
export async function syncChatLastSeenFromServer(): Promise<string | null> {
  const local = readChatLastSeen();
  const remote = await fetchGroupChatLastSeen().catch(() => null);
  const merged = maxIso(local, remote);
  if (merged) writeChatLastSeen(merged);
  return merged;
}
