const SEEN_KEY = "fc-group-chat-last-seen";

export function readChatLastSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function writeChatLastSeen(iso: string) {
  try {
    localStorage.setItem(SEEN_KEY, iso);
  } catch {
    /* ignore */
  }
}

export function markChatSeenFromMessages(messages: Array<{ created_at: string }>) {
  if (!messages.length) {
    const now = new Date().toISOString();
    writeChatLastSeen(now);
    return now;
  }
  const newest = messages.reduce(
    (max, m) => (m.created_at > max ? m.created_at : max),
    messages[0].created_at,
  );
  writeChatLastSeen(newest);
  return newest;
}
