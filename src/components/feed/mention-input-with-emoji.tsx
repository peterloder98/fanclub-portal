"use client";

import { useRef } from "react";
import {
  MentionInput,
  type MentionInputHandle,
} from "@/components/feed/mention-input";
import { EmojiPickerButton } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/cn";

type Props = React.ComponentProps<typeof MentionInput> & {
  emojiSize?: "sm" | "md";
  emojiTone?: "light" | "navy";
  /** Zusätzliche Klassen für die äußere Flex-Zeile (Input + Emoji). */
  rowClassName?: string;
  /** Emoji-Panel: Kommentare nach unten, Chat oft nach oben. */
  emojiPlacement?: "up" | "down";
  /** Ohne Inline-Emoji — z. B. wenn der Button in einer Toolbar liegt. */
  hideEmoji?: boolean;
};

/**
 * MentionInput plus Emoji-Picker.
 * Die äußere Zeile nimmt flex-1 ein, damit Kommentarleisten nicht kollabieren.
 */
export function MentionInputWithEmoji({
  emojiSize = "sm",
  emojiTone = "light",
  rowClassName,
  className,
  emojiPlacement = "down",
  hideEmoji = false,
  ...props
}: Props) {
  const ref = useRef<MentionInputHandle>(null);
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5",
        rowClassName,
      )}
    >
      <MentionInput
        ref={ref}
        className={cn("min-w-0 flex-1", className)}
        {...props}
      />
      {!hideEmoji ? (
        <EmojiPickerButton
          size={emojiSize}
          tone={emojiTone}
          placement={emojiPlacement}
          disabled={props.disabled}
          className="shrink-0"
          onPick={(emoji) => ref.current?.insertText(emoji)}
        />
      ) : null}
    </div>
  );
}
