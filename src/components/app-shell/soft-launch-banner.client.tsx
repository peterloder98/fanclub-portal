"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  BROWSE_ONLY_WRITE_BLOCKED_MESSAGE,
  canMemberWrite,
  isBrowseOnlyMode,
  PORTAL_LAUNCH_LABEL_DE,
} from "@/lib/portal-launch";
import { cn } from "@/lib/cn";

type SoftLaunchContextValue = {
  browseOnly: boolean;
  canWrite: boolean;
  writeBlockedMessage: string;
};

const SoftLaunchContext = createContext<SoftLaunchContextValue>({
  browseOnly: isBrowseOnlyMode(),
  canWrite: false,
  writeBlockedMessage: BROWSE_ONLY_WRITE_BLOCKED_MESSAGE,
});

export function SoftLaunchProvider({
  role,
  children,
}: {
  role: string;
  children: ReactNode;
}) {
  const browseOnly = isBrowseOnlyMode();
  const canWrite = canMemberWrite(role);
  return (
    <SoftLaunchContext.Provider
      value={{
        browseOnly: browseOnly && !canWrite,
        canWrite,
        writeBlockedMessage: BROWSE_ONLY_WRITE_BLOCKED_MESSAGE,
      }}
    >
      {children}
    </SoftLaunchContext.Provider>
  );
}

export function useSoftLaunch() {
  return useContext(SoftLaunchContext);
}

/** Banner für Soft-Launch (nur wenn Schreiben für diesen User gesperrt). */
export function SoftLaunchBanner({ className }: { className?: string }) {
  const { browseOnly } = useSoftLaunch();
  if (!browseOnly) return null;

  return (
    <div
      role="status"
      className={cn(
        "shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-950",
        className,
      )}
    >
      Offizieller Start am <strong>{PORTAL_LAUNCH_LABEL_DE}</strong> — bis dahin gern umschauen.
      Schreiben und Chatten sind noch nicht freigeschaltet.
    </div>
  );
}
