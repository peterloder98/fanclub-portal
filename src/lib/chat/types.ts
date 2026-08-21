import { formatBerlinChatTime } from "@/lib/datetime/berlin";

export type ChatAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type OnlineMember = ChatAuthor & {
  onlineAt?: string;
};

export const GROUP_CHAT_PRESENCE_CHANNEL = "fanclub-online";
export const GROUP_CHAT_PAGE_SIZE = 80;

export function chatDisplayName(p: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  if (p.first_name && p.last_name) return `${p.first_name} ${p.last_name}`;
  return p.first_name || p.last_name || "Mitglied";
}

export function formatChatTime(iso: string) {
  return formatBerlinChatTime(iso);
}
