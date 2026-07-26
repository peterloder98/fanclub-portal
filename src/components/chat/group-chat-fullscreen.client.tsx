"use client";

import { Topbar } from "@/components/app-shell/topbar";
import { GroupChatPanel } from "@/components/chat/group-chat-panel.client";
import { useGroupChat } from "@/lib/chat/use-group-chat";

export function GroupChatFullscreenPage() {
  const chat = useGroupChat({ enabled: true });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Topbar title="Gruppenchat" subtitle="Gemeinsamer Chat für alle Mitglieder." />
      <div className="flex min-h-0 w-full flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex min-h-0 flex-1 flex-col">
          <GroupChatPanel
            mode="fullscreen"
            messages={chat.messages}
            draft={chat.draft}
            sending={chat.sending}
            error={chat.error}
            userId={chat.userId}
            isAdmin={chat.isAdmin}
            onlineCount={chat.onlineCount}
            onlineMembers={chat.onlineMembers}
            cooldownActive={chat.cooldownActive}
            overLimit={chat.overLimit}
            onDraftChange={chat.onDraftChange}
            onSend={chat.onSend}
            onDelete={chat.onDelete}
            onRemoveLocal={chat.onRemoveLocal}
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
