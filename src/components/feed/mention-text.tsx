"use client";

import { MentionProfileLink } from "@/components/feed/mention-profile-link";
import { splitMentionText } from "@/lib/mentions/format";
import { cn } from "@/lib/cn";

export function MentionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = splitMentionText(text);
  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <MentionProfileLink key={`${p.userId}-${i}`} userId={p.userId} name={p.name} />
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}
