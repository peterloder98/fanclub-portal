"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import {
  deleteGroupChatMessage,
  sendGroupChatMessage,
} from "@/app/(app)/chat/actions";
import {
  GROUP_CHAT_COOLDOWN_MS,
  GROUP_CHAT_MAX_LEN,
  type GroupChatMessageRow,
} from "@/lib/chat/constants";
import {
  chatDisplayName,
  GROUP_CHAT_PAGE_SIZE,
  GROUP_CHAT_PRESENCE_CHANNEL,
  type ChatAuthor,
  type OnlineMember,
} from "@/lib/chat/types";

export type ChatMessage = GroupChatMessageRow & { author: ChatAuthor };

type Options = {
  /** When false, skip load/realtime/presence (e.g. dock hidden on /chat). */
  enabled?: boolean;
};

export function useGroupChat({ enabled = true }: Options = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [meProfile, setMeProfile] = useState<ChatAuthor | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const authorsRef = useRef<Map<string, ChatAuthor>>(new Map());

  const cooldownLeftMs = Math.max(0, cooldownUntil - nowTick);
  const cooldownActive = cooldownLeftMs > 0;
  const overLimit = draft.length > GROUP_CHAT_MAX_LEN;
  const onlineCount = Math.max(onlineMembers.length ? onlineMembers.length : 0, meProfile ? 1 : 0);

  useEffect(() => {
    if (!cooldownActive) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooldownActive]);

  const loadAuthors = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !authorsRef.current.has(id));
    if (!missing.length) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,avatar_path,updated_at")
      .in("id", missing);
    for (const p of data ?? []) {
      authorsRef.current.set(p.id, {
        id: p.id,
        name: chatDisplayName(p),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      });
    }
  }, []);

  const hydrate = useCallback(
    async (rows: GroupChatMessageRow[]): Promise<ChatMessage[]> => {
      await loadAuthors(rows.map((r) => r.author_id));
      return rows.map((r) => ({
        ...r,
        author: authorsRef.current.get(r.author_id) ?? {
          id: r.author_id,
          name: "Mitglied",
          avatarUrl: null,
        },
      }));
    },
    [loadAuthors],
  );

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setLoaded(true);
      return;
    }
    setUserId(user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,first_name,last_name,avatar_path,updated_at")
      .eq("id", user.id)
      .maybeSingle();
    setIsAdmin(profile?.role === "admin");
    const me: ChatAuthor = {
      id: user.id,
      name: chatDisplayName(profile ?? {}),
      avatarUrl: getAvatarPublicUrl(profile?.avatar_path, profile?.updated_at),
    };
    setMeProfile(me);
    authorsRef.current.set(user.id, me);

    const { data, error: loadError } = await supabase
      .from("group_chat_messages")
      .select("id,author_id,body,created_at")
      .order("created_at", { ascending: false })
      .limit(GROUP_CHAT_PAGE_SIZE);

    if (loadError) {
      setError(
        /relation|does not exist|group_chat/i.test(loadError.message)
          ? "Chat-Tabelle fehlt — bitte SQL 095 ausführen."
          : loadError.message,
      );
      setLoaded(true);
      return;
    }

    const { data: lastOwn } = await supabase
      .from("group_chat_messages")
      .select("created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastOwn?.created_at) {
      const until = new Date(lastOwn.created_at).getTime() + GROUP_CHAT_COOLDOWN_MS;
      if (until > Date.now()) {
        setCooldownUntil(until);
        setNowTick(Date.now());
      }
    }

    setMessages(await hydrate((data ?? []) as GroupChatMessageRow[]));
    setLoaded(true);
  }, [enabled, hydrate]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !userId || !meProfile) return;
    const supabase = createSupabaseBrowserClient();
    const messagesChannel = supabase
      .channel("group-chat-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_messages" },
        () => void refresh(),
      )
      .subscribe();

    const presenceChannel = supabase.channel(GROUP_CHAT_PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    const syncPresence = () => {
      const state = presenceChannel.presenceState<{
        user_id?: string;
        name?: string;
        avatar_url?: string | null;
        online_at?: string;
      }>();
      const list: OnlineMember[] = [];
      for (const [key, metas] of Object.entries(state)) {
        const meta = metas[0];
        const id = meta?.user_id ?? key;
        list.push({
          id,
          name: meta?.name ?? "Mitglied",
          avatarUrl: meta?.avatar_url ?? null,
          onlineAt: meta?.online_at,
        });
      }
      list.sort((a, b) => a.name.localeCompare(b.name, "de"));
      setOnlineMembers(list.length ? list : meProfile ? [meProfile] : []);
    };

    presenceChannel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user_id: userId,
            name: meProfile.name,
            avatar_url: meProfile.avatarUrl,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(presenceChannel);
    };
  }, [enabled, userId, meProfile, refresh]);

  function onDraftChange(next: string) {
    setDraft(next);
    if (next.length > GROUP_CHAT_MAX_LEN) {
      setError(
        `Zeichenlimit überschritten. Maximal ${GROUP_CHAT_MAX_LEN} Zeichen erlaubt.`,
      );
    } else {
      setError((prev) =>
        prev?.includes("Zeichenlimit") || prev?.includes("kurz warten") ? null : prev,
      );
    }
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || sending || cooldownActive) {
      if (cooldownActive && text) {
        setError("Bitte kurz warten, bevor du erneut schreibst.");
      }
      return;
    }
    if (draft.length > GROUP_CHAT_MAX_LEN) {
      setError(
        `Zeichenlimit überschritten. Maximal ${GROUP_CHAT_MAX_LEN} Zeichen erlaubt.`,
      );
      return;
    }
    setSending(true);
    setError(null);
    const result = await sendGroupChatMessage(text);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.retryAfterMs) {
        setCooldownUntil(Date.now() + result.retryAfterMs);
        setNowTick(Date.now());
      }
      return;
    }
    setDraft("");
    setCooldownUntil(Date.now() + GROUP_CHAT_COOLDOWN_MS);
    setNowTick(Date.now());
    setMessages((prev) => {
      const without = prev.filter((m) => m.id !== result.message.id);
      const author =
        authorsRef.current.get(result.message.author_id) ??
        meProfile ??
        ({ id: result.message.author_id, name: "Du", avatarUrl: null } satisfies ChatAuthor);
      return [{ ...result.message, author }, ...without].slice(0, GROUP_CHAT_PAGE_SIZE);
    });
  }

  async function onDelete(id: string) {
    const prev = messages;
    setMessages((m) => m.filter((x) => x.id !== id));
    const result = await deleteGroupChatMessage(id);
    if (!result.ok) {
      setMessages(prev);
      setError(result.error);
    }
  }

  function onRemoveLocal(id: string) {
    setMessages((m) => m.filter((x) => x.id !== id));
  }

  return {
    messages,
    draft,
    sending,
    error,
    userId,
    isAdmin,
    loaded,
    onlineMembers,
    onlineCount: Math.max(1, onlineCount || onlineMembers.length || 1),
    cooldownActive,
    overLimit,
    onDraftChange,
    onSend,
    onDelete,
    onRemoveLocal,
  };
}
