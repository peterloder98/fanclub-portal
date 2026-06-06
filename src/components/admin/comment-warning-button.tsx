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
  commentType: "post" | "poll" | "giveaway";
  commentId: string;
  /** Sofort aus der UI entfernen (vor Server-Antwort). */
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          const ok = window.confirm(
            "Kommentar löschen und automatische Verwarnung per E-Mail senden?",
          );
          if (!ok) return;
          onRemoved();
          startTransition(async () => {
            try {
              const result = await issueCommentWarning({ commentType, commentId });
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
