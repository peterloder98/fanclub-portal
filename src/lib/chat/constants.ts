export const GROUP_CHAT_COOLDOWN_MS = 10_000;
export const GROUP_CHAT_MAX_LEN = 1000;

export type GroupChatMessageRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};
