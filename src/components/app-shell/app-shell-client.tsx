"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { MainScrollRegion } from "@/components/app-shell/main-scroll-region";
import { TopbarProvider } from "@/components/app-shell/topbar-context";
import { TopbarChrome } from "@/components/app-shell/topbar-chrome";
import { GroupChatWidget } from "@/components/chat/group-chat-widget.client";

export function AppShellClient({ children }: { children: ReactNode }) {
  return (
    <TopbarProvider>
      <div
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none"
      >
        <TopbarChrome />
        <MainScrollRegion>{children}</MainScrollRegion>
        <Suspense fallback={null}>
          <GroupChatWidget />
        </Suspense>
      </div>
    </TopbarProvider>
  );
}
