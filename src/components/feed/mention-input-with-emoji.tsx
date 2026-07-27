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
  rowClassName?: string;
};

/** MentionInput plus Emoji-Picker — für Kommentare und ähnliche Composer. */
export function MentionInputWithEmoji({
  emojiSize = "sm",
  emojiTone = "light",
  rowClassName,
  className,
  ...props
}: Props) {
  const ref = useRef<MentionInputHandle>(null);
  return (
    <div className={cn("flex min-w-0 items-end gap-1", rowClassName)}>
      <MentionInput ref={ref} className={cn("min-w-0 flex-1", className)} {...props} />
      <EmojiPickerButton
        size={emojiSize}
        tone={emojiTone}
        disabled={props.disabled}
        onPick={(emoji) => ref.current?.insertText(emoji)}
      />
    </div>
  );
}
