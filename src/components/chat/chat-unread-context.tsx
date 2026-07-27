"use client";

import { createContext, useContext } from "react";

type ChatUnreadContextValue = {
  hasUnread: boolean;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue>({ hasUnread: false });

export function ChatUnreadProvider({
  hasUnread,
  children,
}: {
  hasUnread: boolean;
  children: React.ReactNode;
}) {
  return (
    <ChatUnreadContext.Provider value={{ hasUnread }}>{children}</ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  return useContext(ChatUnreadContext);
}
