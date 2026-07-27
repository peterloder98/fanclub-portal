"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { issueCommentWarning } from "@/app/(app)/admin/moderation/actions";
import { AdminIconButton } from "@/components/admin/admin-icon-button";

export function CommentWarningButton({
  commentType,
  commentId,
  onRemoved,
}: {
  commentType: "post" | "poll" | "giveaway" | "chat";
  commentId: string;
  /** Sofort aus der UI entfernen, falls gelöscht wird. */
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const noun = commentType === "chat" ? "Nachricht" : "Kommentar";

  return (
    <>
      <AdminIconButton
        label="Verwarnung aussprechen"
        icon={AlertTriangle}
        variant="warn"
        size="sm"
        disabled={pending}
        className="!h-7 !w-7 !rounded-md !shadow-none"
        onClick={() => {
          setError(null);
          const warnOk = window.confirm(
            `Verwarnung aussprechen und automatische E-Mail an das Mitglied senden?`,
          );
          if (!warnOk) return;
          const deleteOk = window.confirm(
            `${noun} zusätzlich löschen?\n\nOK = löschen + verwarnen\nAbbrechen = nur verwarnen (bleibt stehen)`,
          );
          if (deleteOk) onRemoved();
          startTransition(async () => {
            try {
              const result = await issueCommentWarning({
                commentType,
                commentId,
                deleteComment: deleteOk,
              });
              router.refresh();
              if (result.isThirdWarning) {
                window.alert(
                  "Hinweis: Dies ist bereits die 3. Verwarnung für dieses Mitglied. Evtl. sind weitere Schritte nötig.",
                );
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Verwarnung fehlgeschlagen");
              window.alert(
                e instanceof Error
                  ? e.message
                  : "Verwarnung fehlgeschlagen — bitte Seite neu laden.",
              );
              router.refresh();
            }
          });
        }}
      />
      {error ? (
        <span className="sr-only" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
