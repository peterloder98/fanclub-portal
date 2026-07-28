"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
import { installChatAudioUnlock, isChatMuted, playChatBling, setChatMuted, unlockChatAudio } from "@/lib/chat/sound";

export type ChatMessage = GroupChatMessageRow & { author: ChatAuthor };

export type TypingIndicator = {
  userId: string;
  name: string;
};

type PresenceMeta = {
  user_id?: string;
  name?: string;
  avatar_url?: string | null;
  online_at?: string;
};

const TYPING_IDLE_MS = 2800;
/** Presence-Updates lösen kurz Leave+Join aus — Removals verzögern, damit die Online-Zahl nicht flackert. */
const ONLINE_LEAVE_GRACE_MS = 2500;
const TYPING_BROADCAST_EVENT = "typing";
const RECENT_BLING_MAX = 64;

/** Prozessweit: Ton pro Nachricht-ID nur einmal (auch bei mehreren Hook-Instanzen / Reconnect). */
const recentBlingMessageIds = new Set<string>();

function chatMessageTimeMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function maxChatTimestamp(
  isoA: string | null | undefined,
  isoB: string | null | undefined,
): string {
  const a = isoA ? chatMessageTimeMs(isoA) : 0;
  const b = isoB ? chatMessageTimeMs(isoB) : 0;
  if (a >= b) return isoA ?? isoB ?? new Date().toISOString();
  return isoB ?? isoA ?? new Date().toISOString();
}

function markBlingPlayed(messageId: string): boolean {
  if (recentBlingMessageIds.has(messageId)) return false;
  recentBlingMessageIds.add(messageId);
  if (recentBlingMessageIds.size > RECENT_BLING_MAX) {
    const oldest = recentBlingMessageIds.values().next().value;
    if (oldest) recentBlingMessageIds.delete(oldest);
  }
  return true;
}

type Options = {
  /** When false, skip load/realtime/presence (e.g. dock hidden on /chat). */
  enabled?: boolean;
};

type RemoteTyper = { userId: string; name: string; since: string; expiresAt: number };

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
  const [typingIndicator, setTypingIndicator] = useState<TypingIndicator | null>(null);
  const [muted, setMuted] = useState(false);
  const authorsRef = useRef<Map<string, ChatAuthor>>(new Map());
  const knownIdsRef = useRef<Set<string>>(new Set());
  /** Nach erstem Laden: nur Nachrichten danach akustisch melden (kein Fehlalarm bei Refresh/Reconnect). */
  const soundBaselineAtRef = useRef<string | null>(null);
  const soundReadyRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const meProfileRef = useRef<ChatAuthor | null>(null);
  const userIdRef = useRef<string | null>(null);
  const typingSinceRef = useRef<string | null>(null);
  const typingIdleTimerRef = useRef<number | null>(null);
  const lastTypingBroadcastRef = useRef(0);
  const remoteTypersRef = useRef<Map<string, RemoteTyper>>(new Map());
  const onlineSnapshotRef = useRef<Map<string, OnlineMember>>(new Map());
  const pendingLeaveTimersRef = useRef<Map<string, number>>(new Map());

  const cooldownLeftMs = Math.max(0, cooldownUntil - nowTick);
  const cooldownActive = cooldownLeftMs > 0;
  const overLimit = draft.length > GROUP_CHAT_MAX_LEN;
  const onlineCount = Math.max(onlineMembers.length ? onlineMembers.length : 0, meProfile ? 1 : 0);

  const shouldPlaySoundForMessage = useCallback(
    (messageId: string, authorId: string, createdAt: string) => {
      const uid = userIdRef.current;
      if (!uid || !soundReadyRef.current) return false;
      if (authorId === uid) return false;
      if (recentBlingMessageIds.has(messageId)) return false;
      const baseline = soundBaselineAtRef.current;
      if (baseline && chatMessageTimeMs(createdAt) <= chatMessageTimeMs(baseline)) {
        return false;
      }
      return true;
    },
    [],
  );

  const maybePlaySoundForMessage = useCallback(
    (messageId: string, authorId: string, createdAt: string) => {
      if (!shouldPlaySoundForMessage(messageId, authorId, createdAt)) return;
      if (!markBlingPlayed(messageId)) return;
      knownIdsRef.current.add(messageId);
      playChatBling();
    },
    [shouldPlaySoundForMessage],
  );

  const resyncSoundAfterTabReturn = useCallback(() => {
    if (!soundReadyRef.current) return;
    const list = messagesRef.current;
    if (!list.length) return;
    soundBaselineAtRef.current = maxChatTimestamp(
      soundBaselineAtRef.current,
      list[0]?.created_at,
    );
    for (const m of list) knownIdsRef.current.add(m.id);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    meProfileRef.current = meProfile;
  }, [meProfile]);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const publishTyping = useCallback(async (typing: boolean, since: string | null) => {
    const channel = presenceChannelRef.current;
    const me = meProfileRef.current;
    const uid = userIdRef.current;
    if (!channel || !me || !uid) return;
    try {
      await channel.send({
        type: "broadcast",
        event: TYPING_BROADCAST_EVENT,
        payload: {
          user_id: uid,
          name: me.name,
          typing,
          since: typing ? since : null,
        },
      });
    } catch {
      /* ignore */
    }
  }, []);

  const recomputeTypingIndicator = useCallback(() => {
    const uid = userIdRef.current;
    const now = Date.now();
    const active: RemoteTyper[] = [];
    for (const [id, t] of remoteTypersRef.current) {
      if (t.expiresAt <= now || id === uid) {
        remoteTypersRef.current.delete(id);
        continue;
      }
      active.push(t);
    }
    active.sort((a, b) => a.since.localeCompare(b.since));
    const first = active[0];
    setTypingIndicator(first ? { userId: first.userId, name: first.name } : null);
  }, []);

  const clearTyping = useCallback(() => {
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = null;
    }
    if (typingSinceRef.current == null) return;
    typingSinceRef.current = null;
    lastTypingBroadcastRef.current = 0;
    void publishTyping(false, null);
  }, [publishTyping]);

  const bumpTyping = useCallback(() => {
    const now = Date.now();
    const started = !typingSinceRef.current;
    if (started) {
      typingSinceRef.current = new Date().toISOString();
    }
    // Heartbeat, damit die Anzeige bei längerem Tippen nicht abläuft
    if (started || now - lastTypingBroadcastRef.current > 1500) {
      lastTypingBroadcastRef.current = now;
      void publishTyping(true, typingSinceRef.current);
    }
    if (typingIdleTimerRef.current) {
      window.clearTimeout(typingIdleTimerRef.current);
    }
    typingIdleTimerRef.current = window.setTimeout(() => {
      typingSinceRef.current = null;
      typingIdleTimerRef.current = null;
      lastTypingBroadcastRef.current = 0;
      void publishTyping(false, null);
    }, TYPING_IDLE_MS);
  }, [publishTyping]);

  useEffect(() => {
    setMuted(isChatMuted());
    installChatAudioUnlock();
  }, []);

  /** Tab-/App-Wechsel: Realtime-Reconnect darf alte INSERTs nicht erneut belingen. */
  useEffect(() => {
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      resyncSoundAfterTabReturn();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [resyncSoundAfterTabReturn]);

  useEffect(() => {
    if (!cooldownActive) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooldownActive]);

  function toggleMuted() {
    setMuted((prev) => {
      const next = !prev;
      setChatMuted(next);
      if (!next) {
        // Einschalten: Freischalten + lauter Test-Ton (User-Geste → Safari erlaubt Audio)
        void unlockChatAudio().then(() => {
          playChatBling({ force: true });
        });
      }
      return next;
    });
  }

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

    const hydrated = await hydrate((data ?? []) as GroupChatMessageRow[]);
    setMessages(hydrated);
    if (!soundReadyRef.current) {
      knownIdsRef.current = new Set(hydrated.map((m) => m.id));
      soundBaselineAtRef.current =
        hydrated[0]?.created_at ?? new Date().toISOString();
      soundReadyRef.current = true;
    } else {
      for (const m of hydrated) knownIdsRef.current.add(m.id);
    }
    setLoaded(true);
  }, [enabled, hydrate]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  /** Ton bei neuer Nachricht von anderen (Fallback wenn Realtime-Event verpasst wurde). */
  useEffect(() => {
    if (!enabled || !loaded || !userId || !soundReadyRef.current) return;
    for (const m of messages) {
      if (knownIdsRef.current.has(m.id)) continue;
      maybePlaySoundForMessage(m.id, m.author_id, m.created_at);
    }
    knownIdsRef.current = new Set(messages.map((m) => m.id));
  }, [enabled, loaded, userId, messages, maybePlaySoundForMessage]);

  useEffect(() => {
    if (!enabled || !userId) return;
    const supabase = createSupabaseBrowserClient();
    const messagesChannel = supabase
      .channel("group-chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_chat_messages" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "group_chat_messages" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(messagesChannel);
    };
  }, [enabled, userId, refresh]);

  useEffect(() => {
    if (!enabled || !userId || !meProfile) return;
    const supabase = createSupabaseBrowserClient();
    const myId = userId;

    const presenceChannel = supabase.channel(GROUP_CHAT_PRESENCE_CHANNEL, {
      config: {
        presence: { key: myId },
        broadcast: { self: false },
      },
    });
    presenceChannelRef.current = presenceChannel;

    const flushOnlineMembers = () => {
      const list = [...onlineSnapshotRef.current.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "de"),
      );
      const me = meProfileRef.current;
      setOnlineMembers(list.length ? list : me ? [me] : []);
    };

    const syncPresence = () => {
      const state = presenceChannel.presenceState<PresenceMeta>();
      const seen = new Set<string>();

      for (const [key, metas] of Object.entries(state)) {
        // Neueste Meta bevorzugen (mehrere Tabs / Presence-Updates)
        const meta = metas[metas.length - 1] ?? metas[0];
        const id = meta?.user_id ?? key;
        seen.add(id);
        const pending = pendingLeaveTimersRef.current.get(id);
        if (pending) {
          window.clearTimeout(pending);
          pendingLeaveTimersRef.current.delete(id);
        }
        onlineSnapshotRef.current.set(id, {
          id,
          name: meta?.name ?? "Mitglied",
          avatarUrl: meta?.avatar_url ?? null,
          onlineAt: meta?.online_at,
        });
      }

      for (const id of [...onlineSnapshotRef.current.keys()]) {
        if (seen.has(id)) continue;
        if (pendingLeaveTimersRef.current.has(id)) continue;
        const timer = window.setTimeout(() => {
          pendingLeaveTimersRef.current.delete(id);
          const stillGone = !Object.entries(presenceChannel.presenceState<PresenceMeta>()).some(
            ([key, metas]) => (metas[metas.length - 1]?.user_id ?? key) === id,
          );
          if (stillGone) {
            onlineSnapshotRef.current.delete(id);
            flushOnlineMembers();
          }
        }, ONLINE_LEAVE_GRACE_MS);
        pendingLeaveTimersRef.current.set(id, timer);
      }

      flushOnlineMembers();
    };

    presenceChannel
      .on("presence", { event: "sync" }, syncPresence)
      .on("broadcast", { event: TYPING_BROADCAST_EVENT }, ({ payload }) => {
        const p = payload as {
          user_id?: string;
          name?: string;
          typing?: boolean;
          since?: string | null;
        };
        const id = p.user_id?.trim();
        if (!id || id === myId) return;
        if (p.typing) {
          const since = p.since?.trim() || new Date().toISOString();
          const existing = remoteTypersRef.current.get(id);
          remoteTypersRef.current.set(id, {
            userId: id,
            name: p.name?.trim() || existing?.name || "Mitglied",
            since: existing?.since ?? since,
            expiresAt: Date.now() + TYPING_IDLE_MS + 1200,
          });
        } else {
          remoteTypersRef.current.delete(id);
        }
        recomputeTypingIndicator();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const me = meProfileRef.current;
          if (!me) return;
          // Presence nur einmal tracken — Tippen läuft über Broadcast (kein Leave/Join-Flackern)
          await presenceChannel.track({
            user_id: myId,
            name: me.name,
            avatar_url: me.avatarUrl,
            online_at: new Date().toISOString(),
          });
        }
      });

    const typingExpiryTick = window.setInterval(() => {
      if (remoteTypersRef.current.size === 0) return;
      recomputeTypingIndicator();
    }, 500);

    return () => {
      presenceChannelRef.current = null;
      window.clearInterval(typingExpiryTick);
      if (typingIdleTimerRef.current) {
        window.clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
      typingSinceRef.current = null;
      remoteTypersRef.current.clear();
      for (const t of pendingLeaveTimersRef.current.values()) window.clearTimeout(t);
      pendingLeaveTimersRef.current.clear();
      onlineSnapshotRef.current.clear();
      setTypingIndicator(null);
      void supabase.removeChannel(presenceChannel);
    };
  }, [enabled, userId, meProfile?.id, recomputeTypingIndicator]);

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
    if (next.trim()) bumpTyping();
    else clearTyping();
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || sending || cooldownActive) {
      return;
    }
    void unlockChatAudio();
    clearTyping();
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
      if (result.retryAfterMs) {
        setCooldownUntil(Date.now() + result.retryAfterMs);
        setNowTick(Date.now());
        // Zeitsperre: still, kein Hinweistext
      } else if (!/warten|cooldown|zu schnell/i.test(result.error)) {
        setError(result.error);
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
      const next = [{ ...result.message, author }, ...without].slice(0, GROUP_CHAT_PAGE_SIZE);
      // Eigene Nachricht nicht als „fremd“ belingen; Baseline nach vorne schieben
      knownIdsRef.current.add(result.message.id);
      soundBaselineAtRef.current = maxChatTimestamp(
        soundBaselineAtRef.current,
        result.message.created_at,
      );
      return next;
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
    muted,
    toggleMuted,
    typingIndicator,
    onDraftChange,
    onSend,
    onDelete,
    onRemoveLocal,
  };
}
