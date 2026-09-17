"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { MainScrollRegion } from "@/components/app-shell/main-scroll-region";
import { TopbarProvider } from "@/components/app-shell/topbar-context";
import { TopbarChrome } from "@/components/app-shell/topbar-chrome";
import { useIsWelcomeLockRoute } from "@/components/app-shell/use-welcome-lock";
import { ChatUnreadProvider } from "@/components/chat/chat-unread-context";
import { GroupChatWidget } from "@/components/chat/group-chat-widget.client";
import { AppActivityAndOnboarding } from "@/components/app-shell/app-activity-and-onboarding.client";
import { AddToHomeScreenPrompt } from "@/components/app-shell/add-to-home-screen-prompt";
import { EngagementNudgeHost } from "@/components/engagement/engagement-nudge-host";
import {
  SoftLaunchBanner,
  SoftLaunchProvider,
} from "@/components/app-shell/soft-launch-banner.client";

export function AppShellClient({
  children,
  needsIntroOnboarding = false,
  role = "member",
  userId = null,
  showAnniFinance = false,
  hideGroupChat = false,
}: {
  children: ReactNode;
  needsIntroOnboarding?: boolean;
  role?: string;
  userId?: string | null;
  showAnniFinance?: boolean;
  hideGroupChat?: boolean;
}) {
  const welcomeLock = useIsWelcomeLockRoute();

  return (
    <SoftLaunchProvider role={role} userId={userId}>
      <TopbarProvider>
        <ChatUnreadProvider>
          <div
            id="main-content"
            tabIndex={-1}
            className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden outline-none"
          >
            {welcomeLock ? null : <TopbarChrome showAnniFinance={showAnniFinance} />}
            {welcomeLock ? null : <SoftLaunchBanner />}
            <MainScrollRegion>{children}</MainScrollRegion>
            <AppActivityAndOnboarding needsWelcomeOnboarding={needsIntroOnboarding} />
            {welcomeLock ? null : (
              <>
                <AddToHomeScreenPrompt />
                <Suspense fallback={null}>
                  <EngagementNudgeHost />
                </Suspense>
                {hideGroupChat ? null : (
                  <Suspense fallback={null}>
                    <GroupChatWidget />
                  </Suspense>
                )}
              </>
            )}
          </div>
        </ChatUnreadProvider>
      </TopbarProvider>
    </SoftLaunchProvider>
  );
}
