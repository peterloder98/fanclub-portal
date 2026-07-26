"use client";

import Link from "next/link";
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
          <Link
            key={`${p.userId}-${i}`}
            href={`/mitglieder?focus=${p.userId}`}
            className="rounded-md bg-fc-ice px-1 py-0.5 font-semibold text-fc-blue hover:bg-fc-sky/30"
            onClick={(e) => e.stopPropagation()}
          >
            @{p.name}
          </Link>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}
