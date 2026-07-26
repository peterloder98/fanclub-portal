"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatMentionToken } from "@/lib/mentions/format";
import { cn } from "@/lib/cn";

export type MentionCandidate = {
  id: string;
  name: string;
  membershipNumber: string | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLTextAreaElement | HTMLInputElement>;
};

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
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  function setRefs(el: HTMLTextAreaElement | HTMLInputElement | null) {
    (inputRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = el;
    if (typeof externalRef === "function") externalRef(el);
    else if (externalRef && "current" in externalRef) {
      (externalRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = el;
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
        .select("id,first_name,last_name,membership_number")
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
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "de")),
      );
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  function detectMention(next: string, caret: number) {
    const before = next.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at < 0) {
      setOpen(false);
      setMentionStart(null);
      return;
    }
    const between = before.slice(at + 1);
    if (/[\s\n]/.test(between) || between.includes("[")) {
      setOpen(false);
      setMentionStart(null);
      return;
    }
    setMentionStart(at);
    setQuery(between);
    setOpen(true);
    setActiveIdx(0);
  }

  function insertMention(m: MentionCandidate) {
    if (mentionStart == null || !inputRef.current) return;
    const el = inputRef.current;
    const caret = el.selectionStart ?? value.length;
    const token = formatMentionToken(m.name, m.id);
    const next = value.slice(0, mentionStart) + token + " " + value.slice(caret);
    onChange(next);
    setOpen(false);
    setMentionStart(null);
    setQuery("");
    requestAnimationFrame(() => {
      const pos = mentionStart + token.length + 1;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleChange(next: string, caret: number) {
    onChange(next);
    detectMention(next, caret);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
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
    onKeyDown?.(e);
  }

  const sharedProps = {
    ref: setRefs as never,
    value,
    disabled,
    placeholder,
    onKeyDown: handleKeyDown,
    onFocus,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length);
    },
    className: cn(inputClassName),
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {multiline ? (
        <textarea rows={rows} {...sharedProps} />
      ) : (
        <input type="text" {...sharedProps} />
      )}
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
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                  i === activeIdx && "bg-fc-ice",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
              >
                <span className="font-medium text-fc-navy">{m.name}</span>
                {m.membershipNumber ? (
                  <span className="text-xs text-slate-500">Nr. {m.membershipNumber}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
