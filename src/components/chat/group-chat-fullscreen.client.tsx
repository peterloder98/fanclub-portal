"use client";

import { Topbar } from "@/components/app-shell/topbar";
import { GroupChatPanel } from "@/components/chat/group-chat-panel.client";
import { useGroupChat } from "@/lib/chat/use-group-chat";

export function GroupChatFullscreenPage() {
  const chat = useGroupChat({ enabled: true });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar title="Gruppenchat" subtitle="Gemeinsamer Chat für alle Mitglieder." />
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4 lg:px-8">
        <div className="flex min-h-[min(70vh,40rem)] flex-1 flex-col">
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
          />
        </div>
      </div>
    </div>
  );
}
