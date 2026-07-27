"use client";

import { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef, useLayoutEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatMentionToken, splitMentionText } from "@/lib/mentions/format";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { cn } from "@/lib/cn";
import { UserAvatar } from "@/components/ui/user-avatar";

export type MentionCandidate = {
  id: string;
  name: string;
  membershipNumber: string | null;
  avatarUrl: string | null;
};

export type MentionInputHandle = {
  insertText: (text: string) => void;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLDivElement>;
};

function serializeEditor(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.mentionId) {
      out += formatMentionToken(
        node.dataset.mentionName ?? node.textContent?.replace(/^@/, "") ?? "Mitglied",
        node.dataset.mentionId,
      );
      return;
    }
    if (node.tagName === "BR") {
      out += "\n";
      return;
    }
    if (node.tagName === "DIV" || node.tagName === "P") {
      if (out.length && !out.endsWith("\n")) out += "\n";
      node.childNodes.forEach(walk);
      return;
    }
    node.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out.replace(/^\n+/, "");
}

function createMentionChip(name: string, userId: string): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.dataset.mentionId = userId;
  chip.dataset.mentionName = name;
  chip.contentEditable = "false";
  chip.className =
    "mention-chip mx-0.5 inline-flex items-center rounded-md bg-fc-ice px-1 font-semibold text-fc-blue align-middle leading-none";
  chip.textContent = name;
  return chip;
}

function fillEditorFromValue(root: HTMLElement, value: string) {
  root.replaceChildren();
  const parts = splitMentionText(value);
  for (const part of parts) {
    if (part.type === "mention") {
      root.appendChild(createMentionChip(part.name, part.userId));
    } else if (part.value) {
      root.appendChild(document.createTextNode(part.value));
    }
  }
  if (!root.childNodes.length) {
    root.appendChild(document.createTextNode(""));
  }
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function getPlainBeforeCaret(root: HTMLElement): { text: string; range: Range } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const walkerRoot = document.createElement("div");
  walkerRoot.appendChild(pre.cloneContents());
  return { text: serializeEditor(walkerRoot), range };
}

export const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(
  {
    value,
    onChange,
    placeholder,
    rows = 3,
    className,
    inputClassName,
    multiline = true,
    onKeyDown,
    onFocus,
    onBlur,
    disabled,
    inputRef: externalRef,
  },
  ref,
) {
  const [members, setMembers] = useState<MentionCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const skipSyncRef = useRef(false);
  const mentionStartRef = useRef<number | null>(null);

  function setEditorRef(el: HTMLDivElement | null) {
    editorRef.current = el;
    if (typeof externalRef === "function") externalRef(el);
    else if (externalRef && "current" in externalRef) {
      (externalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  }

  function emitFromEditor() {
    const el = editorRef.current;
    if (!el) return;
    skipSyncRef.current = true;
    onChange(serializeEditor(el));
  }

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const el = editorRef.current;
      if (!el || disabled) return;
      el.focus();
      try {
        document.execCommand("insertText", false, text);
      } catch {
        el.appendChild(document.createTextNode(text));
      }
      emitFromEditor();
      placeCaretAtEnd(el);
    },
    focus() {
      editorRef.current?.focus();
    },
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: memberships } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("status", "active");
      const ids = [...new Set((memberships ?? []).map((m) => m.user_id))];
      if (!ids.length) return;
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,membership_number,avatar_path,updated_at")
        .in("id", ids);
      if (cancelled) return;
      setMembers(
        (profiles ?? [])
          .map((p) => ({
            id: p.id,
            name:
              p.first_name && p.last_name
                ? `${p.first_name} ${p.last_name}`
                : p.first_name || p.last_name || "Mitglied",
            membershipNumber: p.membership_number ?? null,
            avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "de")),
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    if (serializeEditor(el) === value) return;
    fillEditorFromValue(el, value);
  }, [value]);

  // Caret/Text vertikal mittig: line-height = tatsächliche Feldhöhe (h-8/h-9/h-10)
  useLayoutEffect(() => {
    if (multiline) return;
    const el = editorRef.current;
    const shell = el?.parentElement;
    if (!el || !shell) return;
    const apply = () => {
      el.style.lineHeight = `${shell.clientHeight}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [multiline, inputClassName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, query]);

  function detectMentionFromCaret() {
    const before = getPlainBeforeCaret(editorRef.current!);
    if (!before) {
      setOpen(false);
      mentionStartRef.current = null;
      return;
    }
    const at = before.text.lastIndexOf("@");
    if (at < 0) {
      setOpen(false);
      mentionStartRef.current = null;
      return;
    }
    const between = before.text.slice(at + 1);
    if (/[\s\n]/.test(between) || between.includes("[")) {
      setOpen(false);
      mentionStartRef.current = null;
      return;
    }
    mentionStartRef.current = at;
    setQuery(between);
    setOpen(true);
    setActiveIdx(0);
  }

  function placeCaretAfterPlainOffset(root: HTMLElement, offset: number) {
    let remaining = offset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const nodes: Node[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) nodes.push(node);

    for (const n of nodes) {
      if (n instanceof HTMLElement && n.dataset.mentionId) {
        const tokenLen = formatMentionToken(
          n.dataset.mentionName ?? "",
          n.dataset.mentionId,
        ).length;
        if (remaining <= tokenLen) {
          const range = document.createRange();
          range.setStartAfter(n);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          return;
        }
        remaining -= tokenLen;
        continue;
      }
      if (n.nodeType === Node.TEXT_NODE) {
        if ((n.parentElement as HTMLElement | null)?.dataset?.mentionId) continue;
        const len = n.textContent?.length ?? 0;
        if (remaining <= len) {
          const range = document.createRange();
          range.setStart(n, remaining);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
          return;
        }
        remaining -= len;
      }
    }
    placeCaretAtEnd(root);
  }

  function insertMention(m: MentionCandidate) {
    const el = editorRef.current;
    if (!el || mentionStartRef.current == null) return;
    const caretInfo = getPlainBeforeCaret(el);
    if (!caretInfo) return;

    const full = serializeEditor(el);
    const start = mentionStartRef.current;
    const end = caretInfo.text.length;
    const token = formatMentionToken(m.name, m.id);
    const next = full.slice(0, start) + token + " " + full.slice(end);
    skipSyncRef.current = true;
    fillEditorFromValue(el, next);
    onChange(next);
    placeCaretAfterPlainOffset(el, start + token.length + 1);

    setOpen(false);
    mentionStartRef.current = null;
    setQuery("");
  }

  function handleInput() {
    emitFromEditor();
    detectMentionFromCaret();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (open && filtered.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[activeIdx]!);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
    }
    onKeyDown?.(e);
  }

  const minHeight = multiline ? `${Math.max(rows, 1) * 1.5}rem` : undefined;
  const singleLineLike = !multiline;

  const editor = (
    <div
      ref={setEditorRef}
      role="textbox"
      aria-multiline={multiline && !singleLineLike}
      aria-placeholder={placeholder}
      contentEditable={!disabled}
      data-mention-editor={singleLineLike ? "single" : "multi"}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        if (singleLineLike) {
          const el = e.currentTarget;
          // Leeres contentEditable oft mit <br> → Caret klebt oben
          if (!serializeEditor(el).trim() && el.innerHTML !== "") {
            el.replaceChildren();
          }
        }
        onFocus?.(e);
      }}
      onBlur={onBlur}
      onClick={() => detectMentionFromCaret()}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      className={cn(
        "text-left text-fc-navy outline-none",
        singleLineLike
          ? "absolute inset-0 z-0"
          : "w-full box-border overflow-y-auto whitespace-pre-wrap break-words leading-snug",
        disabled && "cursor-not-allowed opacity-60",
        !singleLineLike && inputClassName,
      )}
      style={{ minHeight: singleLineLike ? undefined : minHeight }}
    />
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {singleLineLike ? (
        <div className={cn("relative box-border overflow-hidden", inputClassName)}>
          {!value && placeholder ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 z-[1] flex items-center text-sm text-slate-400 lg:text-sm">
              {placeholder}
            </span>
          ) : null}
          {editor}
        </div>
      ) : (
        <div className="relative">
          {!value && placeholder ? (
            <span className="pointer-events-none absolute left-3 top-2.5 z-[1] text-sm text-slate-400">
              {placeholder}
            </span>
          ) : null}
          {editor}
        </div>
      )}
      {open && filtered.length ? (
        <ul
          className="absolute bottom-full z-40 mb-1 max-h-[11.5rem] w-full overflow-y-auto rounded-xl border bg-white py-1 shadow-lg shadow-slate-900/10"
          role="listbox"
        >
          {filtered.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50",
                  i === activeIdx && "bg-fc-ice",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
              >
                <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="xs" />
                <span className="min-w-0 flex-1 truncate font-medium text-fc-navy">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});

MentionInput.displayName = "MentionInput";
