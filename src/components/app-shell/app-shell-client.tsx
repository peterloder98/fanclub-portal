"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { MainScrollRegion } from "@/components/app-shell/main-scroll-region";
import { TopbarProvider } from "@/components/app-shell/topbar-context";
import { TopbarChrome } from "@/components/app-shell/topbar-chrome";
import { ChatUnreadProvider } from "@/components/chat/chat-unread-context";
import { GroupChatWidget } from "@/components/chat/group-chat-widget.client";
import { AppActivityAndOnboarding } from "@/components/app-shell/app-activity-and-onboarding.client";

export function AppShellClient({
  children,
  needsIntroOnboarding = false,
}: {
  children: ReactNode;
  needsIntroOnboarding?: boolean;
}) {
  return (
    <TopbarProvider>
      <ChatUnreadProvider>
        <div
          id="main-content"
          tabIndex={-1}
          className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden outline-none"
        >
          <TopbarChrome />
          <MainScrollRegion>{children}</MainScrollRegion>
          <AppActivityAndOnboarding needsWelcomeOnboarding={needsIntroOnboarding} />
          <Suspense fallback={null}>
            <GroupChatWidget />
          </Suspense>
        </div>
      </ChatUnreadProvider>
    </TopbarProvider>
  );
}
