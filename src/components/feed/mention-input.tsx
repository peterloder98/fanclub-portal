"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    "mention-chip mx-0.5 inline-flex align-baseline rounded-md bg-fc-ice px-1 py-0.5 text-[inherit] font-semibold text-fc-blue";
  chip.textContent = `@${name}`;
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

export function MentionInput({
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
}: Props) {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.membershipNumber ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [members, query]);

  function emitFromEditor() {
    const el = editorRef.current;
    if (!el) return;
    skipSyncRef.current = true;
    onChange(serializeEditor(el));
  }

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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        {!value ? (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={setEditorRef}
          role="textbox"
          aria-multiline={multiline}
          aria-placeholder={placeholder}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={() => detectMentionFromCaret()}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          className={cn(
            "w-full overflow-y-auto whitespace-pre-wrap break-words text-left text-sm text-fc-navy outline-none",
            !multiline && "overflow-x-auto whitespace-nowrap",
            disabled && "cursor-not-allowed opacity-60",
            inputClassName,
          )}
          style={{ minHeight }}
        />
      </div>
      {open && filtered.length ? (
        <ul
          className="absolute bottom-full z-40 mb-1 max-h-56 w-full overflow-auto rounded-xl border bg-white py-1 shadow-lg shadow-slate-900/10"
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
                {m.membershipNumber ? (
                  <span className="shrink-0 text-xs text-slate-500">Nr. {m.membershipNumber}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
