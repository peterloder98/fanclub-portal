"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ChatUnreadContextValue = {
  hasUnread: boolean;
  setHasUnread: (value: boolean) => void;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue>({
  hasUnread: false,
  setHasUnread: () => {},
});

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const [hasUnread, setHasUnread] = useState(false);
  const value = useMemo(() => ({ hasUnread, setHasUnread }), [hasUnread]);
  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
