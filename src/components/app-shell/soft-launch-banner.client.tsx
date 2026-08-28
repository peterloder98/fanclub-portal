"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  BROWSE_ONLY_WRITE_BLOCKED_MESSAGE,
  canMemberChat,
  canMemberWrite,
  isBrowseOnlyMode,
  PORTAL_LAUNCH_LABEL_DE,
  SPECTATOR_WRITE_BLOCKED_MESSAGE,
  writeBlockedMessageFor,
} from "@/lib/portal-launch";
import { isBrowseOnlyProfileId } from "@/lib/members/hidden";
import { cn } from "@/lib/cn";

type SoftLaunchContextValue = {
  browseOnly: boolean;
  canWrite: boolean;
  canChat: boolean;
  writeBlockedMessage: string;
};

const SoftLaunchContext = createContext<SoftLaunchContextValue>({
  browseOnly: isBrowseOnlyMode(),
  canWrite: false,
  canChat: true,
  writeBlockedMessage: BROWSE_ONLY_WRITE_BLOCKED_MESSAGE,
});

export function SoftLaunchProvider({
  role,
  userId = null,
  children,
}: {
  role: string;
  userId?: string | null;
  children: ReactNode;
}) {
  const spectator = isBrowseOnlyProfileId(userId);
  const canWrite = canMemberWrite(role, Date.now(), userId);
  const canChat = canMemberChat(role, Date.now(), userId);
  const browseOnly = spectator || (isBrowseOnlyMode() && !canWrite);
  return (
    <SoftLaunchContext.Provider
      value={{
        browseOnly,
        canWrite,
        canChat,
        writeBlockedMessage: writeBlockedMessageFor(userId),
      }}
    >
      {children}
    </SoftLaunchContext.Provider>
  );
}

export function useSoftLaunch() {
  return useContext(SoftLaunchContext);
}

/** Banner für Soft-Launch oder stille Vorschau (Schreiben gesperrt). */
export function SoftLaunchBanner({ className }: { className?: string }) {
  const { browseOnly, writeBlockedMessage } = useSoftLaunch();
  if (!browseOnly) return null;

  const spectator = writeBlockedMessage === SPECTATOR_WRITE_BLOCKED_MESSAGE;

  return (
    <div
      role="status"
      className={cn(
        "shrink-0 border-b px-4 py-2.5 text-center text-sm",
        spectator
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : "border-amber-200 bg-amber-50 text-amber-950",
        className,
      )}
    >
      {spectator ? (
        writeBlockedMessage
      ) : (
        <>
          Offizieller Start am <strong>{PORTAL_LAUNCH_LABEL_DE}</strong> — Profil, Kennenlernen, Chat und
          Geburtstagsgratulationen sind schon frei; eigene Posts, Umfragen und Gewinnspiele folgen dann.
        </>
      )}
    </div>
  );
}
