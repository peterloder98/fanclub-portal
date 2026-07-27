"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, MessageCircle, Pencil, Pin, PinOff, Reply, SendHorizontal, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { setPostPinned, notifyPendingPostCreated } from "@/app/(app)/admin/posts/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAvatarPublicUrl } from "@/lib/avatars/url";
import { profileToUserListEntry } from "@/lib/profiles/display";
import { optimizePostImage } from "@/lib/posts/optimize-image";
import { postMediaPublicUrl } from "@/lib/posts/media-url";
import { captureFlyRect, flyPointsFromElement } from "@/lib/points/fly";
import { POINT_VALUES } from "@/lib/points/values";
import {
  deltaAfterCommentDelete,
  deltaAfterCommentInsert,
  fetchPostCommentPointsTxn,
} from "@/lib/points/post-comment-client";
import {
  FANCLUB_AUTHOR_LOGO,
  FANCLUB_AUTHOR_NAME,
} from "@/lib/feed/fanclub-author";
import { applyPollVotePointsFx } from "@/lib/points/poll-vote-fx";
import {
  PollFeedCard,
  type PollFeedData,
  type OptionRow as PollOptionRow,
  type VoteRow as PollVoteRow,
  type Voter as PollVoter,
} from "@/components/polls/poll-feed-card";
import { UserListPopover, type UserListEntry } from "@/components/ui/user-list-popover";
import { HoverEnlargeAvatar } from "@/components/ui/hover-enlarge-avatar";
import { PostMediaGallery } from "@/components/feed/post-media-gallery";
import { invalidatePollVoterCache } from "@/lib/polls/invalidate-voter-cache";
import { CommentWarningButton } from "@/components/admin/comment-warning-button";
import { MentionInputWithEmoji } from "@/components/feed/mention-input-with-emoji";
import {
  MentionInput,
  type MentionInputHandle,
} from "@/components/feed/mention-input";
import { EmojiPickerButton } from "@/components/ui/emoji-picker";
import { MentionText } from "@/components/feed/mention-text";
import { MentionProfileLink } from "@/components/feed/mention-profile-link";
import { ComposerMediaGrid, type ComposerMediaItem } from "@/components/feed/composer-media-grid";
import { POST_MEDIA_MAX_COUNT } from "@/lib/images/specs";
import { notifyMentionsFromText } from "@/app/(app)/posts/mention-actions";

type FeedPost = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorRole: "admin" | "anni" | "member";
  authorAvatarUrl: string | null;
  createdAtLabel: string;
  title: string;
  body: string;
  status?: "pending" | "approved" | "rejected" | "deleted";
  lastActivityAt?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | null;
  isBirthday?: boolean;
  birthdayDate?: string | null;
  media: Array<{ id: string; url: string }>;
  likedByMe?: boolean;
  likeCount: number;
  comments: Array<{
    id: string;
    authorId: string;
    author: string;
    authorAvatarUrl: string | null;
    createdAt: string;
    createdAtLabel: string;
    text: string;
    parentCommentId: string | null;
    replyToUserId: string | null;
    replyToName: string | null;
    likedByMe?: boolean;
    likeCount?: number;
  }>;
};

type ReplyingTo = {
  postId: string;
  commentId: string;
  userId: string;
  userName: string;
};

type FeedComment = FeedPost["comments"][number];

type ComposerMedia = ComposerMediaItem;

function organizePostComments(comments: FeedComment[]) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const roots: FeedComment[] = [];
  const repliesByRoot = new Map<string, FeedComment[]>();

  const findRootId = (comment: FeedComment): string => {
    let current = comment;
    while (current.parentCommentId) {
      const parent = byId.get(current.parentCommentId);
      if (!parent) break;
      current = parent;
    }
    return current.id;
  };

  for (const c of comments) {
    if (!c.parentCommentId) {
      roots.push(c);
    } else {
      const rootId = findRootId(c);
      const list = repliesByRoot.get(rootId) ?? [];
      list.push(c);
      repliesByRoot.set(rootId, list);
    }
  }

  roots.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const list of repliesByRoot.values()) {
    list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }

  return { roots, repliesByRoot };
}

function resolveReplyParentId(comments: FeedComment[], replyCommentId: string) {
  const target = comments.find((c) => c.id === replyCommentId);
  return target?.parentCommentId ?? replyCommentId;
}

function CommentBody({
  text,
  replyToName,
  replyToUserId,
}: {
  text: string;
  replyToName: string | null;
  replyToUserId?: string | null;
}) {
  let displayText = text;
  if (replyToName) {
    const legacyPrefix = `@${replyToName}`;
    if (displayText.startsWith(legacyPrefix)) {
      displayText = displayText.slice(legacyPrefix.length).trimStart();
    }
  }

  const replyLabel = replyToName ? (
    replyToUserId ? (
      <MentionProfileLink userId={replyToUserId} name={replyToName} />
    ) : (
      <span className="rounded-md bg-fc-ice px-1 py-0.5 font-semibold text-fc-blue">
        {replyToName}
      </span>
    )
  ) : null;

  return (
    <p className="text-xs leading-snug text-slate-700">
      {replyLabel ? (
        <>
          {replyLabel}
          {displayText ? (
            <>
              {" "}
              <MentionText text={displayText} />
            </>
          ) : null}
        </>
      ) : (
        <MentionText text={displayText} />
      )}
    </p>
  );
}

type FeedItem =
  | { kind: "post"; id: string; activityAt: string; post: FeedPost }
  | { kind: "poll"; id: string; activityAt: string; poll: PollFeedData };

const initial: FeedPost[] = [];

function PostFeedInner({
  embedPollsInFeed = false,
}: {
  embedPollsInFeed?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [focusPostId, setFocusPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>(initial);
  const [draftByPostId, setDraftByPostId] = useState<Record<string, string>>(
    {},
  );
  const [me, setMe] = useState<{
    id: string;
    name: string;
    role: "admin" | "anni" | "member";
    avatarUrl: string | null;
    initials: string;
  } | null>(null);
  const [newText, setNewText] = useState("");
  const [composerDraftPostId, setComposerDraftPostId] = useState<string | null>(null);
  const [composerMedia, setComposerMedia] = useState<ComposerMedia[]>([]);
  const [composerUploading, setComposerUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLDivElement>(null);
  const composerMentionRef = useRef<MentionInputHandle>(null);
  const commentInputRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setFocusPostId(null);
      return;
    }
    let postId = searchParams.get("post");
    if (!postId && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.startsWith("#post-")) postId = hash.slice(6);
    }
    setFocusPostId(postId);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!focusPostId || !posts.some((p) => p.id === focusPostId)) return;
    const el = document.getElementById(`feed-post-${focusPostId}`);
    if (!el) return;
    const scrollTimer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    const clearTimer = window.setTimeout(() => setFocusPostId(null), 5000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [focusPostId, posts]);
  const pollCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollPollIdRef = useRef<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});
  const [commentLikeBusy, setCommentLikeBusy] = useState<Record<string, boolean>>({});
  const [composerExpanded, setComposerExpanded] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [feedPolls, setFeedPolls] = useState<PollFeedData[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOptionRow[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVoteRow[]>([]);
  const [myPollOptionsByPoll, setMyPollOptionsByPoll] = useState<Map<string, Set<string>>>(
    new Map(),
  );
  const [pollVotersByOption, setPollVotersByOption] = useState<Record<string, PollVoter[]>>({});
  const [pollParticipantsByPollId, setPollParticipantsByPollId] = useState<
    Record<string, PollVoter[]>
  >({});
  const [pollBusyKey, setPollBusyKey] = useState<string | null>(null);
  const [likersByPostId, setLikersByPostId] = useState<Record<string, UserListEntry[]>>({});
  const [likersLoadingPostId, setLikersLoadingPostId] = useState<string | null>(null);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);

  async function ensureLikers(postId: string) {
    if (postId in likersByPostId) return;
    setLikersLoadingPostId(postId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: likes } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", postId);
      const ids = Array.from(new Set((likes ?? []).map((l) => l.user_id)));
      if (!ids.length) {
        setLikersByPostId((m) => ({ ...m, [postId]: [] }));
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,email,avatar_path,updated_at")
        .in("id", ids);
      const users: UserListEntry[] = (profiles ?? [])
        .map((p) => ({
          id: p.id,
          name:
            p.first_name && p.last_name
              ? `${p.first_name} ${p.last_name}`
              : (p.email ?? "Mitglied"),
          avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "de"));
      setLikersByPostId((m) => ({ ...m, [postId]: users }));
    } finally {
      setLikersLoadingPostId(null);
    }
  }

  const mergedFeed = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [
      ...posts.map((p) => ({
        kind: "post" as const,
        id: p.id,
        activityAt: p.lastActivityAt ?? new Date().toISOString(),
        post: p,
      })),
      ...(embedPollsInFeed
        ? feedPolls.map((poll) => ({
            kind: "poll" as const,
            id: poll.id,
            activityAt: poll.lastActivityAt,
            poll,
          }))
        : []),
    ];

    const now = new Date();
    const todayBerlin = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const score = (iso: string) => {
      const t = new Date(iso).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    const isAdminPinned = (p: FeedPost) => Boolean(p.isPinned);
    const isPinnedBirthday = (p: FeedPost) =>
      Boolean(p.isBirthday) && Boolean(p.birthdayDate) && p.birthdayDate === todayBerlin;

    return items.sort((a, b) => {
      const aAdminPin = a.kind === "post" && isAdminPinned(a.post);
      const bAdminPin = b.kind === "post" && isAdminPinned(b.post);
      if (aAdminPin !== bAdminPin) return aAdminPin ? -1 : 1;
      if (aAdminPin && bAdminPin) {
        return score(b.post.pinnedAt ?? b.activityAt) - score(a.post.pinnedAt ?? a.activityAt);
      }
      const ap = a.kind === "post" && isPinnedBirthday(a.post);
      const bp = b.kind === "post" && isPinnedBirthday(b.post);
      if (ap !== bp) return ap ? -1 : 1;
      return score(b.activityAt) - score(a.activityAt);
    });
  }, [posts, feedPolls, embedPollsInFeed]);

  useEffect(() => {
    const pollId = pendingScrollPollIdRef.current;
    if (!pollId) return;
    pendingScrollPollIdRef.current = null;
    requestAnimationFrame(() => {
      pollCardRefs.current[pollId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [mergedFeed]);

  const canManagePost = (post: FeedPost) =>
    me &&
    (post.isBirthday ? me.role === "admin" : me.id === post.authorId || me.role === "admin");

  useEffect(() => {
    async function loadMeAndFeed() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("first_name,last_name,role,avatar_path,updated_at")
          .eq("id", user.id)
          .maybeSingle();
        if (profileErr) throw profileErr;

        const name =
          profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : user.email ?? "Du";
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const initials =
          (parts.at(0)?.[0] ?? "U") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "");

        setMe({
          id: user.id,
          name,
          role: (profile?.role ?? "member") as "admin" | "anni" | "member",
          avatarUrl: getAvatarPublicUrl(profile?.avatar_path ?? null, profile?.updated_at ?? null),
          initials: initials.toUpperCase(),
        });

        // Load posts (v1) — is_pinned optional until migration 088 is applied
        type PostRow = {
          id: string;
          title: string;
          body: string;
          author_id: string | null;
          author_role: "admin" | "anni" | "member";
          created_at: string;
          status?: string | null;
          last_activity_at?: string | null;
          is_birthday?: boolean | null;
          birthday_date?: string | null;
          is_pinned?: boolean | null;
          pinned_at?: string | null;
        };
        let postsData: PostRow[] | null = null;
        {
          const withPin = await supabase
            .from("posts")
            .select("id,title,body,author_id,author_role,created_at,status,last_activity_at,is_birthday,birthday_date,is_pinned,pinned_at")
            .order("is_pinned", { ascending: false, nullsFirst: false })
            .order("pinned_at", { ascending: false, nullsFirst: false })
            .order("last_activity_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(20);
          if (withPin.error && /is_pinned|pinned_at/i.test(withPin.error.message)) {
            const withoutPin = await supabase
              .from("posts")
              .select("id,title,body,author_id,author_role,created_at,status,last_activity_at,is_birthday,birthday_date")
              .order("last_activity_at", { ascending: false, nullsFirst: false })
              .order("created_at", { ascending: false })
              .limit(20);
            if (withoutPin.error) throw withoutPin.error;
            postsData = withoutPin.data as PostRow[] | null;
          } else if (withPin.error) {
            throw withPin.error;
          } else {
            postsData = withPin.data as PostRow[] | null;
          }
        }

        const postIds = (postsData ?? []).map((p) => p.id);
        const postAuthorIds = Array.from(
          new Set((postsData ?? []).map((p) => p.author_id).filter(Boolean)),
        ) as string[];

        const { data: mediaRows, error: mediaErr } = await supabase
          .from("post_media")
          .select("id,post_id,storage_path,created_at")
          .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"])
          .order("created_at", { ascending: true });
        if (mediaErr) throw mediaErr;
        const mediaByPost = new Map<string, Array<{ id: string; url: string }>>();
        (mediaRows ?? []).forEach((m) => {
          if (!mediaByPost.has(m.post_id)) mediaByPost.set(m.post_id, []);
          const url = postMediaPublicUrl(m.storage_path);
          if (url) mediaByPost.get(m.post_id)!.push({ id: m.id, url });
        });

        const { data: likesData, error: likesErr } = await supabase
          .from("post_likes")
          .select("post_id,user_id,created_at")
          .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"]);
        if (likesErr) throw likesErr;

        const { data: commentsData, error: commentsErr } = await supabase
          .from("post_comments")
          .select("id,post_id,author_id,body,created_at,parent_comment_id,reply_to_user_id")
          .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"])
          .order("created_at", { ascending: true });
        if (commentsErr) throw commentsErr;

        const commentIds = (commentsData ?? []).map((c) => c.id);
        const commentLikesByComment = new Map<string, Set<string>>();
        if (commentIds.length) {
          try {
            const { data: commentLikesData, error: commentLikesErr } = await supabase
              .from("post_comment_likes")
              .select("comment_id,user_id")
              .in("comment_id", commentIds);
            if (commentLikesErr) throw commentLikesErr;
            (commentLikesData ?? []).forEach((l) => {
              if (!commentLikesByComment.has(l.comment_id)) {
                commentLikesByComment.set(l.comment_id, new Set());
              }
              commentLikesByComment.get(l.comment_id)!.add(l.user_id);
            });
          } catch {
            // post_comment_likes Tabelle evtl. noch nicht angelegt — Likes einfach überspringen.
          }
        }

        const replyToIds = Array.from(
          new Set(
            (commentsData ?? [])
              .map((c) => c.reply_to_user_id as string | null)
              .filter(Boolean),
          ),
        ) as string[];

        // Map author names for comments
        const authorIds = Array.from(
          new Set([
            ...(commentsData ?? []).map((c) => c.author_id),
            ...replyToIds,
          ]),
        );
        const { data: authorProfiles, error: authorsErr } = await supabase
          .from("profiles")
          .select("id,first_name,last_name,email,avatar_path,updated_at")
          .in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
        if (authorsErr) throw authorsErr;

        const authorMap = new Map(
          (authorProfiles ?? []).map((a) => [
            a.id,
            {
              name:
                a.first_name && a.last_name
                  ? `${a.first_name} ${a.last_name}`
                  : a.email ?? "Mitglied",
              avatarUrl: getAvatarPublicUrl(a.avatar_path, a.updated_at),
            },
          ]),
        );

        const { data: postAuthorProfiles, error: postAuthorsErr } =
          postAuthorIds.length
            ? await supabase
                .from("profiles")
                .select("id,first_name,last_name,email,avatar_path,updated_at")
                .in("id", postAuthorIds)
            : { data: [], error: null };
        if (postAuthorsErr) throw postAuthorsErr;
        const postAuthorMap = new Map(
          (postAuthorProfiles ?? []).map((a: any) => [
            a.id,
            {
              name:
                a.first_name && a.last_name
                  ? `${a.first_name} ${a.last_name}`
                  : a.email ?? "Mitglied",
              avatarUrl: getAvatarPublicUrl(a.avatar_path, a.updated_at),
            },
          ]),
        );

        const likesByPost = new Map<string, Set<string>>();
        const latestLikeByPost = new Map<string, string>();
        (likesData ?? []).forEach((l) => {
          if (!likesByPost.has(l.post_id)) likesByPost.set(l.post_id, new Set());
          likesByPost.get(l.post_id)!.add(l.user_id);
          if (l.created_at) {
            const prev = latestLikeByPost.get(l.post_id);
            if (!prev || new Date(l.created_at).getTime() > new Date(prev).getTime()) {
              latestLikeByPost.set(l.post_id, l.created_at);
            }
          }
        });

        const commentsByPost = new Map<string, FeedPost["comments"]>();
        const latestCommentByPost = new Map<string, string>();
        (commentsData ?? []).forEach((c) => {
          if (!commentsByPost.has(c.post_id)) commentsByPost.set(c.post_id, []);
          const author = authorMap.get(c.author_id);
          const replyTo = c.reply_to_user_id
            ? authorMap.get(c.reply_to_user_id as string)
            : null;
          const commentLikeSet = commentLikesByComment.get(c.id) ?? new Set<string>();
          commentsByPost.get(c.post_id)!.push({
            id: c.id,
            authorId: c.author_id,
            author: author?.name ?? "Mitglied",
            authorAvatarUrl: author?.avatarUrl ?? null,
            createdAt: c.created_at,
            createdAtLabel: new Date(c.created_at).toLocaleString("de-DE", {
              dateStyle: "short",
              timeStyle: "short",
            }),
            text: c.body,
            parentCommentId: (c.parent_comment_id as string | null) ?? null,
            replyToUserId: (c.reply_to_user_id as string | null) ?? null,
            replyToName: replyTo?.name ?? null,
            likedByMe: commentLikeSet.has(user.id),
            likeCount: commentLikeSet.size,
          });
          if (c.created_at) {
            const prev = latestCommentByPost.get(c.post_id);
            if (!prev || new Date(c.created_at).getTime() > new Date(prev).getTime()) {
              latestCommentByPost.set(c.post_id, c.created_at);
            }
          }
        });

        const mappedPosts = (postsData ?? []).map((p) => {
            const likedSet = likesByPost.get(p.id) ?? new Set<string>();
            const lastActivity = (p as any).last_activity_at ?? null;
            const computed = [
              p.created_at,
              latestLikeByPost.get(p.id),
              latestCommentByPost.get(p.id),
              lastActivity,
            ]
              .filter(Boolean)
              .map((s) => new Date(String(s)).getTime())
              .filter((t) => Number.isFinite(t))
              .sort((a, b) => b - a)[0];

            const isBirthday = Boolean((p as any).is_birthday);
            return {
              id: p.id,
              authorId: p.author_id ?? null,
              authorName: isBirthday
                ? FANCLUB_AUTHOR_NAME
                : postAuthorMap.get(p.author_id)?.name ??
                  (p.author_role === "anni"
                    ? FANCLUB_AUTHOR_NAME
                    : p.author_role === "admin"
                      ? "Admin"
                      : "Mitglied"),
              authorRole: p.author_role,
              authorAvatarUrl: isBirthday
                ? FANCLUB_AUTHOR_LOGO
                : postAuthorMap.get(p.author_id)?.avatarUrl ?? null,
              createdAtLabel: new Date(p.created_at).toLocaleString("de-DE", {
                dateStyle: "short",
                timeStyle: "short",
              }),
              title: "",
              body: p.body,
              status: (p as any).status ?? "approved",
              lastActivityAt: computed ? new Date(computed).toISOString() : p.created_at,
              isPinned: Boolean((p as any).is_pinned),
              pinnedAt: (p as any).pinned_at ?? null,
              isBirthday,
              birthdayDate: (p as any).birthday_date ?? null,
              media: mediaByPost.get(p.id) ?? [],
              likedByMe: likedSet.has(user.id),
              likeCount: likedSet.size,
              comments: commentsByPost.get(p.id) ?? [],
            };
          }).filter((p) => {
            // Public feed: only approved. Authors see own pending/rejected.
            if (p.status === "approved" || !p.status) return true;
            return p.authorId === user.id;
          });
        setPosts(mappedPosts);

        if (embedPollsInFeed) {
          const { data: pollRows } = await supabase
            .from("polls")
            .select("id,question,allow_multiple,ends_at,created_at,author_id")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(20);
          const polls = pollRows ?? [];
          const pollIds = polls.map((p) => p.id);

          const pollAuthorIds = Array.from(new Set(polls.map((p) => p.author_id)));
          const { data: pollAuthors } = await supabase
            .from("profiles")
            .select("id,first_name,last_name,email,avatar_path,updated_at")
            .in(
              "id",
              pollAuthorIds.length ? pollAuthorIds : ["00000000-0000-0000-0000-000000000000"],
            );
          const pollAuthorMap = new Map(
            (pollAuthors ?? []).map((a) => [
              a.id,
              {
                name:
                  a.first_name && a.last_name
                    ? `${a.first_name} ${a.last_name}`
                    : (a.email ?? "Mitglied"),
                avatarUrl: getAvatarPublicUrl(a.avatar_path, a.updated_at),
              },
            ]),
          );

          let optRows: PollOptionRow[] = [];
          let voteRows: PollVoteRow[] = [];
          if (pollIds.length) {
            const { data: o } = await supabase
              .from("poll_options")
              .select("id,poll_id,label,sort_order")
              .in("poll_id", pollIds);
            optRows = o ?? [];
            const { data: v } = await supabase
              .from("poll_votes")
              .select("poll_id,option_id,user_id,created_at")
              .in("poll_id", pollIds);
            voteRows = v ?? [];
          }

          const latestVoteByPoll = new Map<string, string>();
          voteRows.forEach((v) => {
            if (!v.created_at) return;
            const prev = latestVoteByPoll.get(v.poll_id);
            if (!prev || new Date(v.created_at).getTime() > new Date(prev).getTime()) {
              latestVoteByPoll.set(v.poll_id, v.created_at);
            }
          });

          const mineByPoll = new Map<string, Set<string>>();
          voteRows
            .filter((v) => v.user_id === user.id)
            .forEach((v) => {
              if (!mineByPoll.has(v.poll_id)) mineByPoll.set(v.poll_id, new Set());
              mineByPoll.get(v.poll_id)!.add(v.option_id);
            });

          const voterIds = Array.from(new Set(voteRows.map((v) => v.user_id)));
          const { data: voterProfiles } = await supabase
            .from("profiles")
            .select("id,first_name,last_name,email,avatar_path,updated_at")
            .in("id", voterIds.length ? voterIds : ["00000000-0000-0000-0000-000000000000"]);
          const voterMap = new Map(
            (voterProfiles ?? []).map((p) => [p.id, profileToUserListEntry(p)]),
          );
          const byOpt: Record<string, PollVoter[]> = {};
          voteRows.forEach((v) => {
            const voter = voterMap.get(v.user_id);
            if (!voter) return;
            (byOpt[v.option_id] ??= []).push(voter);
          });

          setFeedPolls(
            polls.map((p) => {
              const lastVote = latestVoteByPoll.get(p.id);
              const activity = [p.created_at, lastVote]
                .filter(Boolean)
                .map((s) => new Date(String(s)).getTime())
                .filter((t) => Number.isFinite(t))
                .sort((a, b) => b - a)[0];
              const author = pollAuthorMap.get(p.author_id);
              return {
                id: p.id,
                question: p.question,
                allow_multiple: p.allow_multiple,
                ends_at: p.ends_at,
                created_at: p.created_at,
                lastActivityAt: activity ? new Date(activity).toISOString() : p.created_at,
                authorId: p.author_id,
                authorName: author?.name ?? "Admin",
                authorAvatarUrl: author?.avatarUrl ?? null,
                createdAtLabel: new Date(p.created_at).toLocaleString("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                }),
              };
            }),
          );
          setPollOptions(optRows);
          setPollVotes(voteRows);
          setMyPollOptionsByPoll(mineByPoll);
          setPollVotersByOption(byOpt);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const recursion = /infinite recursion|profiles_select_authenticated/i.test(msg);
        setLoadError(
          recursion
            ? "Feed konnte nicht geladen werden: Datenbank-Policy für Profile verursacht eine Endlosschleife. Bitte `supabase/025_fix_profiles_select_recursion.sql` im Supabase SQL Editor ausführen und die Seite neu laden."
            : `Feed konnte nicht geladen werden: ${msg}. Falls Tabellen fehlen: \`supabase/004_posts_comments_likes.sql\` und \`008_posts_moderation_media.sql\`.`,
        );
      }
    }
    void loadMeAndFeed();
  }, [embedPollsInFeed]);

  function toggleLike(postId: string) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.likedByMe;
        const nowIso = new Date().toISOString();
        return {
          ...p,
          likedByMe: nextLiked,
          likeCount: Math.max(0, p.likeCount + (nextLiked ? 1 : -1)),
          lastActivityAt: nextLiked ? nowIso : p.lastActivityAt,
        };
      }),
    );
  }

  function setCommentLikeState(
    postId: string,
    commentId: string,
    likedByMe: boolean,
    likeDelta: number,
  ) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c.id !== commentId
              ? c
              : {
                  ...c,
                  likedByMe,
                  likeCount: Math.max(0, (c.likeCount ?? 0) + likeDelta),
                },
          ),
        };
      }),
    );
  }

  async function toggleCommentLike(postId: string, comment: FeedComment) {
    if (!me || commentLikeBusy[comment.id]) return;
    const nextLiked = !comment.likedByMe;
    setCommentLikeBusy((b) => ({ ...b, [comment.id]: true }));
    setCommentLikeState(postId, comment.id, nextLiked, nextLiked ? 1 : -1);
    try {
      const supabase = createSupabaseBrowserClient();
      if (nextLiked) {
        const { error } = await supabase
          .from("post_comment_likes")
          .insert({ comment_id: comment.id, user_id: me.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_comment_likes")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", me.id);
        if (error) throw error;
      }
    } catch {
      setCommentLikeState(postId, comment.id, !nextLiked, nextLiked ? -1 : 1);
    } finally {
      setCommentLikeBusy((b) => ({ ...b, [comment.id]: false }));
    }
  }

  function startReply(postId: string, comment: FeedPost["comments"][number]) {
    setReplyingTo({
      postId,
      commentId: comment.id,
      userId: comment.authorId,
      userName: comment.author,
    });
    setDraftByPostId((d) => ({
      ...d,
      [postId]: "",
    }));
    requestAnimationFrame(() => commentInputRefs.current[postId]?.focus());
  }

  function addComment(postId: string, fromEl?: HTMLElement | null) {
    const text = (draftByPostId[postId] ?? "").trim();
    if (!text) return;
    if (!me) return;
    const post = posts.find((p) => p.id === postId);
    const replyCtx =
      replyingTo?.postId === postId ? replyingTo : null;
    const parentCommentId = replyCtx
      ? resolveReplyParentId(post?.comments ?? [], replyCtx.commentId)
      : null;
    const flyFrom =
      fromEl ?? commentInputRefs.current[postId] ?? null;
    const flyRect = flyFrom?.getBoundingClientRect() ?? null;
    setDraftByPostId((d) => ({ ...d, [postId]: "" }));
    setReplyingTo((r) => (r?.postId === postId ? null : r));
    const nowLabel = new Date().toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
    const tempId = crypto.randomUUID();
    const isBirthday = Boolean(post?.isBirthday);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          lastActivityAt: new Date().toISOString(),
          comments: [
            ...p.comments,
            {
              id: tempId,
              authorId: me.id,
              author: me.name,
              authorAvatarUrl: me.avatarUrl,
              createdAt: new Date().toISOString(),
              createdAtLabel: nowLabel,
              text,
              parentCommentId,
              replyToUserId: replyCtx?.userId ?? null,
              replyToName: replyCtx?.userName ?? null,
            },
          ],
        };
      }),
    );

    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const beforeTxn = await fetchPostCommentPointsTxn(
          supabase,
          me.id,
          postId,
          isBirthday,
        );

        const insertRow: Record<string, unknown> = {
          post_id: postId,
          author_id: me.id,
          body: text,
        };
        if (replyCtx) {
          insertRow.parent_comment_id = parentCommentId;
          insertRow.reply_to_user_id = replyCtx.userId;
        }

        const { data: inserted, error } = await supabase
          .from("post_comments")
          .insert(insertRow)
          .select("id")
          .single();

        if (error) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id !== postId
                ? p
                : { ...p, comments: p.comments.filter((c) => c.id !== tempId) },
            ),
          );
          setLoadError(error.message);
          return;
        }

        if (inserted?.id) {
          setPosts((prev) =>
            prev.map((p) =>
              p.id !== postId
                ? p
                : {
                    ...p,
                    comments: p.comments.map((c) =>
                      c.id === tempId ? { ...c, id: inserted.id } : c,
                    ),
                  },
            ),
          );

          void notifyMentionsFromText({ text, postId, context: "comment" });

          const post = posts.find((p) => p.id === postId);
          if (replyCtx) {
            void fetch("/api/comments/notify-reply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                parentCommentId: replyCtx.commentId,
                postId,
                replyPreview: text,
              }),
            }).catch(() => {});
          } else if (post?.authorId && post.authorId !== me.id) {
            void fetch("/api/comments/notify-post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                postId,
                commentPreview: text,
              }),
            }).catch(() => {});
          }
        }

        let afterTxn = await fetchPostCommentPointsTxn(
          supabase,
          me.id,
          postId,
          isBirthday,
        );
        let uiDelta = deltaAfterCommentInsert(beforeTxn, afterTxn);

        if (uiDelta === 0) {
          await fetch("/api/points/post-comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId }),
          });
          afterTxn = await fetchPostCommentPointsTxn(
            supabase,
            me.id,
            postId,
            isBirthday,
          );
          uiDelta = deltaAfterCommentInsert(beforeTxn, afterTxn);
        }

        if (uiDelta > 0) {
          flyPointsFromElement({ fromRect: flyRect, delta: uiDelta });
        }
      } catch {
        // ignore for now
      }
    })();
  }

  function startEdit(post: FeedPost) {
    setEditingId(post.id);
    setEditBody(post.body);
  }

  async function saveEdit(postId: string) {
    const text = editBody.trim();
    if (!text || !me) return;
    const supabase = createSupabaseBrowserClient();
    const title = text.length > 36 ? `${text.slice(0, 36)}…` : text;
    const { error } = await supabase
      .from("posts")
      .update({ body: text, title })
      .eq("id", postId);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, body: text } : p)),
    );
    setEditingId(null);
    setEditBody("");
  }

  async function deletePost(postId: string) {
    if (!me) return;
    if (!window.confirm("Post wirklich löschen?")) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  async function togglePostPinned(post: FeedPost) {
    if (!me || me.role !== "admin") return;
    const next = !post.isPinned;
    setPinBusyId(post.id);
    setLoadError(null);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isPinned: next,
              pinnedAt: next ? new Date().toISOString() : null,
            }
          : p,
      ),
    );
    try {
      const result = await setPostPinned(post.id, next);
      if (!result.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, isPinned: post.isPinned, pinnedAt: post.pinnedAt ?? null }
              : p,
          ),
        );
        setLoadError(result.error);
      }
    } catch (e) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, isPinned: post.isPinned, pinnedAt: post.pinnedAt ?? null }
            : p,
        ),
      );
      setLoadError(e instanceof Error ? e.message : "Fixieren fehlgeschlagen.");
    } finally {
      setPinBusyId(null);
    }
  }

  async function ensureComposerDraftPost(
    supabase: ReturnType<typeof createSupabaseBrowserClient>,
  ) {
    if (!me) throw new Error("Nicht angemeldet");
    if (composerDraftPostId) return composerDraftPostId;
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: me.id,
        author_role: me.role,
        title: "…",
        body: "",
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    setComposerDraftPostId(data.id);
    return data.id;
  }

  async function uploadMediaToPost(postId: string, files: File[], existingCount: number) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const videos = files.filter((f) => f.type.startsWith("video/"));
    const optimizedImages = await Promise.all(images.map((f) => optimizePostImage(f)));

    const fd = new FormData();
    fd.append("postId", postId);
    fd.append("existingCount", String(existingCount));
    optimizedImages.forEach((o, idx) => {
      fd.append("files", o.blob, `img_${idx}.webp`);
    });
    videos.forEach((v, idx) => {
      fd.append("files", v, `vid_${idx}.mp4`);
    });

    const res = await fetch("/api/post-media/upload", { method: "POST", body: fd });
    const json = (await res.json()) as {
      ok?: boolean;
      error?: string;
      files?: Array<{
        id: string;
        path: string;
        url: string | null;
        mediaType: "image" | "video";
      }>;
    };
    if (!res.ok || !json.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
    return (json.files ?? [])
      .map((f) => ({
        id: f.id,
        url: f.url ?? "",
        storagePath: f.path,
        mediaType: f.mediaType,
      }))
      .filter((m) => Boolean(m.url));
  }

  async function removeComposerMedia(item: ComposerMedia) {
    if (!composerDraftPostId) {
      setComposerMedia((prev) => prev.filter((m) => m.id !== item.id));
      return;
    }
    setComposerUploading(true);
    try {
      const res = await fetch("/api/post-media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: composerDraftPostId,
          mediaId: item.id,
          storagePath: item.storagePath,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Löschen fehlgeschlagen");
      setComposerMedia((prev) => prev.filter((m) => m.id !== item.id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setComposerUploading(false);
    }
  }

  function reorderComposerMedia(fromIndex: number, toIndex: number) {
    setComposerMedia((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleComposerFiles(picked: File[]) {
    if (!me || !picked.length) return;
    const images = picked.filter((f) => f.type.startsWith("image/"));
    const videos = picked.filter((f) => f.type.startsWith("video/"));
    if (videos.length && me.role !== "admin") {
      setLoadError("Videos können nur von Admins gepostet werden.");
      return;
    }
    if (videos.length && me.role === "admin") {
      // Admin-Videos werden serverseitig stark komprimiert.
    }
    const batch = [...images, ...videos];
    if (!batch.length) return;

    const remaining = Math.max(0, POST_MEDIA_MAX_COUNT - composerMedia.length);
    const slice = batch.slice(0, remaining);
    if (!slice.length) {
      setLoadError(`Maximal ${POST_MEDIA_MAX_COUNT} Medien pro Post.`);
      return;
    }

    setComposerExpanded(true);
    setComposerUploading(true);
    setLoadError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const postId = await ensureComposerDraftPost(supabase);
      const uploaded = await uploadMediaToPost(postId, slice, composerMedia.length);
      setComposerMedia((prev) => [...prev, ...uploaded]);
      requestAnimationFrame(() => composerInputRef.current?.focus());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setComposerUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function resetComposerState() {
    setNewText("");
    setComposerMedia([]);
    setComposerDraftPostId(null);
    setComposerExpanded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submitNewPost() {
    if (!me) return;
    const text = newText.trim();
    if (!text) return;
    if (composerMedia.length > POST_MEDIA_MAX_COUNT) {
      setLoadError(`Maximal ${POST_MEDIA_MAX_COUNT} Medien pro Post.`);
      return;
    }
    setSubmitting(true);
    setLoadError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const status = me.role === "member" ? "pending" : "approved";
      const title = text.length > 36 ? `${text.slice(0, 36)}…` : text;

      let postRow: {
        id: string;
        created_at: string;
        author_role: "admin" | "anni" | "member";
        status?: string | null;
        title: string;
        body: string;
      };
      let uploadedMedia: ComposerMedia[] = [];

      if (composerDraftPostId) {
        const { data, error: updErr } = await supabase
          .from("posts")
          .update({
            title,
            body: text,
            status,
            last_activity_at: new Date().toISOString(),
          })
          .eq("id", composerDraftPostId)
          .select("id,created_at,author_role,status,title,body")
          .single();
        if (updErr) throw updErr;
        postRow = data;
        uploadedMedia = composerMedia;
      } else {
        const { data, error: insErr } = await supabase
          .from("posts")
          .insert({
            author_id: me.id,
            author_role: me.role,
            title,
            body: text,
            status,
          })
          .select("id,created_at,author_role,status,title,body")
          .single();
        if (insErr) throw insErr;
        postRow = data;
      }

      void notifyMentionsFromText({ text, postId: postRow.id, context: "post" });

      resetComposerState();

      // Show own post immediately (pending = only visible to author until approved).
      setPosts((prev) => [
        {
          id: postRow.id,
          authorId: me.id,
          authorName: me.name,
          authorRole: me.role,
          authorAvatarUrl: me.avatarUrl,
          createdAtLabel: new Date(postRow.created_at).toLocaleString("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
          }),
          title: postRow.title,
          body: postRow.body,
          status: status === "pending" ? "pending" : "approved",
          lastActivityAt: new Date().toISOString(),
          isPinned: false,
          pinnedAt: null,
          isBirthday: false,
          birthdayDate: null,
          media: uploadedMedia,
          likeCount: 0,
          likedByMe: false,
          comments: [],
        },
        ...prev,
      ]);

      if (status === "pending") {
        void notifyPendingPostCreated(postRow.id).catch(console.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Post konnte nicht erstellt werden.";
      setLoadError(
        msg.includes("status") || msg.includes("post_media") || msg.includes("post-media")
          ? "DB/Storage noch nicht bereit. Bitte `supabase/008_posts_moderation_media.sql` ausführen und Storage-Bucket `post-media` anlegen (public, dev)."
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePollVote(pollId: string, optionId: string, fromEl: HTMLElement) {
    if (!me) return;
    const poll = feedPolls.find((p) => p.id === pollId);
    if (!poll) return;
    const ended = new Date(poll.ends_at).getTime() < Date.now();
    if (ended || pollBusyKey) return;

    const fromRect = captureFlyRect(fromEl);
    setPollBusyKey(`${pollId}:${optionId}`);
    const supabase = createSupabaseBrowserClient();
    const mine = myPollOptionsByPoll.get(pollId) ?? new Set<string>();
    const votesBefore = mine.size;
    const isSelected = mine.has(optionId);

    try {
      if (poll.allow_multiple) {
        if (isSelected) {
          await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_id", pollId)
            .eq("user_id", me.id)
            .eq("option_id", optionId);
        } else {
          await supabase.from("poll_votes").insert({
            poll_id: pollId,
            user_id: me.id,
            option_id: optionId,
          });
        }
      } else if (isSelected) {
        await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", me.id);
      } else {
        await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", me.id);
        await supabase.from("poll_votes").insert({
          poll_id: pollId,
          user_id: me.id,
          option_id: optionId,
        });
      }

      const { data: voteRows } = await supabase
        .from("poll_votes")
        .select("poll_id,option_id,user_id,created_at")
        .eq("poll_id", pollId);
      setPollVotes((prev) => [
        ...prev.filter((v) => v.poll_id !== pollId),
        ...(voteRows ?? []),
      ]);
      const mineSet = new Set(
        (voteRows ?? []).filter((v) => v.user_id === me.id).map((v) => v.option_id),
      );
      const votesAfter = mineSet.size;

      applyPollVotePointsFx({ votesBefore, votesAfter, fromRect });

      const nowIso = new Date().toISOString();
      setFeedPolls((prev) =>
        prev.map((p) => (p.id === pollId ? { ...p, lastActivityAt: nowIso } : p)),
      );
      pendingScrollPollIdRef.current = pollId;

      setMyPollOptionsByPoll((m) => new Map(m).set(pollId, mineSet));

      const optionIdsForPoll = pollOptions
        .filter((o) => o.poll_id === pollId)
        .map((o) => o.id);
      invalidatePollVoterCache(setPollVotersByOption, optionIdsForPoll);
      setPollParticipantsByPollId((m) => {
        const next = { ...m };
        delete next[pollId];
        return next;
      });
    } finally {
      setPollBusyKey(null);
    }
  }

  async function ensurePollParticipants(pollId: string) {
    if (pollParticipantsByPollId[pollId]) return;
    const supabase = createSupabaseBrowserClient();
    const { data: vRows } = await supabase
      .from("poll_votes")
      .select("user_id")
      .eq("poll_id", pollId);
    const ids = Array.from(new Set((vRows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const mapped =
      (profiles ?? []).map((p) => ({
        id: p.id,
        name:
          p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      })) ?? [];
    setPollParticipantsByPollId((m) => ({ ...m, [pollId]: mapped }));
  }

  async function ensurePollVoters(optionId: string) {
    const supabase = createSupabaseBrowserClient();
    const { data: vRows } = await supabase
      .from("poll_votes")
      .select("user_id")
      .eq("option_id", optionId);
    const ids = Array.from(new Set((vRows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,email,avatar_path,updated_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const mapped =
      (profiles ?? []).map((p) => ({
        id: p.id,
        name:
          p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (p.email ?? "Mitglied"),
        avatarUrl: getAvatarPublicUrl(p.avatar_path, p.updated_at),
      })) ?? [];
    setPollVotersByOption((m) => ({ ...m, [optionId]: mapped }));
  }

  async function saveCommentEdit(postId: string, commentId: string) {
    const text = editCommentText.trim();
    if (!text || !me) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("post_comments")
      .update({ body: text })
      .eq("id", commentId)
      .eq("author_id", me.id);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : {
              ...p,
              comments: p.comments.map((c) =>
                c.id === commentId ? { ...c, text } : c,
              ),
            },
      ),
    );
    setEditingCommentId(null);
    setEditCommentText("");
  }

  const composerHasContent = Boolean(
    newText.trim() || composerMedia.length > 0 || composerUploading,
  );

  const tryCollapseComposer = () => {
    if (!composerHasContent && !dragActive) setComposerExpanded(false);
  };

  useEffect(() => {
    if (!composerExpanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (composerRef.current?.contains(e.target as Node)) return;
      tryCollapseComposer();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [composerExpanded, composerHasContent, dragActive]);

  async function deleteComment(
    postId: string,
    commentId: string,
    fromEl?: HTMLElement | null,
  ) {
    if (!me) return;
    if (!window.confirm("Kommentar löschen?")) return;
    const flyRect = fromEl?.getBoundingClientRect() ?? null;
    const post = posts.find((p) => p.id === postId);
    const comment = post?.comments.find((c) => c.id === commentId);
    const isOwn = comment?.authorId === me.id;

    const supabase = createSupabaseBrowserClient();
    const isBirthday = Boolean(post?.isBirthday);
    const beforeTxn =
      isOwn && me
        ? await fetchPostCommentPointsTxn(supabase, me.id, postId, isBirthday)
        : null;

    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== postId
          ? p
          : { ...p, comments: p.comments.filter((c) => c.id !== commentId) },
      ),
    );

    if (!isOwn || !me) return;

    try {
      let afterTxn = await fetchPostCommentPointsTxn(
        supabase,
        me.id,
        postId,
        isBirthday,
      );
      let uiDelta = deltaAfterCommentDelete(beforeTxn, afterTxn);

      if (uiDelta === 0 && beforeTxn) {
        await fetch("/api/points/post-comment", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
        afterTxn = await fetchPostCommentPointsTxn(
          supabase,
          me.id,
          postId,
          isBirthday,
        );
        uiDelta = deltaAfterCommentDelete(beforeTxn, afterTxn);
      }

      if (uiDelta < 0) {
        flyPointsFromElement({ fromRect: flyRect, delta: uiDelta });
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-hidden">
      <Card className="overflow-hidden border-blue-100/90 bg-gradient-to-br from-sky-50/80 via-white to-rose-50/50 shadow-sm shadow-blue-900/5">
        <CardContent ref={composerRef} className="pt-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "shrink-0 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-rose-100 shadow-sm transition-all duration-200 ease-out",
                composerExpanded ? "h-10 w-10 shadow-md ring-2 ring-blue-200/80" : "h-7 w-7 ring-1 ring-slate-200/80",
              )}
              aria-hidden
            >
              {me?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs font-semibold text-slate-600">
                  {me?.initials ?? "…"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  me?.role === "admin"
                    ? "image/jpeg,image/png,image/webp,video/*"
                    : "image/jpeg,image/png,image/webp"
                }
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  if (picked.length) void handleComposerFiles(picked);
                }}
              />
              <MentionInput
                ref={composerMentionRef}
                value={newText}
                onChange={setNewText}
                inputRef={composerInputRef}
                onFocus={() => setComposerExpanded(true)}
                onBlur={() => {
                  window.setTimeout(() => tryCollapseComposer(), 120);
                }}
                placeholder="Schreib etwas…"
                rows={composerExpanded ? 3 : 1}
                inputClassName={cn(
                  "w-full resize-none rounded-2xl border px-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400",
                  composerExpanded
                    ? "min-h-[88px] border-fc-sky/30 bg-white py-2.5 leading-snug shadow-inner shadow-blue-900/[0.03] focus:border-blue-300 focus:ring-4 focus:ring-blue-500/15"
                    : "h-10 border-slate-200/90 bg-white/90 py-0 leading-10 focus:border-fc-sky/30 focus:ring-2 focus:ring-blue-500/10",
                )}
              />

              {!composerExpanded ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <EmojiPickerButton
                    size="sm"
                    placement="down"
                    label="Emoji"
                    disabled={!me}
                    onPick={(emoji) => {
                      setComposerExpanded(true);
                      composerMentionRef.current?.insertText(emoji);
                    }}
                    buttonClassName="h-8 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-fc-sky/30 hover:bg-fc-ice/50 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!me || composerUploading}
                    className="h-8 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-fc-sky/30 hover:bg-fc-ice/50 disabled:opacity-50"
                  >
                    {composerUploading ? "Lädt…" : "Foto auswählen"}
                  </button>
                </div>
              ) : null}

              {composerExpanded ? (
                <div className="mt-2.5 grid gap-2.5">
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                      setComposerExpanded(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const picked = Array.from(e.dataTransfer.files ?? []);
                      if (picked.length) void handleComposerFiles(picked);
                    }}
                    className={cn(
                      "rounded-xl border border-dashed px-3 py-2.5 transition",
                      dragActive
                        ? "border-blue-400 bg-fc-ice/70"
                        : "border-fc-sky/30/60 bg-gradient-to-r from-white/90 to-sky-50/50",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <EmojiPickerButton
                        size="sm"
                        placement="down"
                        label="Emoji"
                        disabled={!me}
                        onPick={(emoji) => composerMentionRef.current?.insertText(emoji)}
                        buttonClassName="h-9 rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-fc-sky/30 hover:bg-fc-ice/50 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!me || composerUploading}
                        className="h-9 rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-fc-sky/30 hover:bg-fc-ice/50 disabled:opacity-50"
                      >
                        {composerUploading ? "Lädt…" : "Foto auswählen"}
                      </button>
                      <button
                        type="button"
                        disabled={!me || submitting || !newText.trim()}
                        onClick={submitNewPost}
                        className="h-9 rounded-xl bg-fc-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-fc-blue disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting
                          ? "Sende…"
                          : me?.role === "member"
                            ? "Zur Freigabe senden"
                            : "Posten"}
                      </button>
                    </div>
                    <ComposerMediaGrid
                      items={composerMedia}
                      disabled={composerUploading}
                      onRemove={(id) => {
                        const item = composerMedia.find((m) => m.id === id);
                        if (item) void removeComposerMedia(item);
                      }}
                      onReorder={reorderComposerMedia}
                    />
                  </div>
                  {me?.role === "member" ? (
                    <p className="text-xs text-slate-500">
                      Dein Post wird erst nach Freigabe durch einen Admin angezeigt.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <div className="rounded-2xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      ) : mergedFeed.length === 0 ? (
        <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Noch keine Beiträge. Schreib oben den ersten Post oder lege eine Umfrage an.
        </div>
      ) : null}
      {mergedFeed.map((item) =>
        item.kind === "poll" ? (
          <div
            key={`poll-${item.id}`}
            ref={(el) => {
              pollCardRefs.current[item.poll.id] = el;
            }}
          >
            <PollFeedCard
              poll={item.poll}
              options={pollOptions}
              votes={pollVotes}
              myOptionIds={myPollOptionsByPoll.get(item.poll.id) ?? new Set()}
              votersByOptionId={pollVotersByOption}
              busyKey={pollBusyKey}
              compact={embedPollsInFeed}
              onToggleVote={(optionId, fromEl) =>
                void togglePollVote(item.poll.id, optionId, fromEl)
              }
              onEnsureVoters={(optionId) => void ensurePollVoters(optionId)}
              participants={pollParticipantsByPollId[item.poll.id] ?? []}
              onEnsureParticipants={() => void ensurePollParticipants(item.poll.id)}
            />
          </div>
        ) : (
        (() => {
          const post = item.post;
          return (
        <Card
          key={post.id}
          id={`feed-post-${post.id}`}
          className={cn(
            "overflow-hidden rounded-xl scroll-mt-24 transition-shadow duration-500",
            focusPostId === post.id && "ring-2 ring-fc-blue shadow-md shadow-fc-sky/20",
          )}
        >
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <HoverEnlargeAvatar
                name={post.authorName}
                avatarUrl={post.authorAvatarUrl}
                size="sm"
                className="min-w-0 flex-1"
                href={post.authorId ? `/mitglieder/${post.authorId}` : null}
              >
                <span className="truncate text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{post.authorName}</span>
                  <span className="text-slate-400"> · {post.createdAtLabel}</span>
                  {post.isPinned ? (
                    <Badge variant="brand" className="ml-1.5 px-1.5 py-0 text-[10px]">
                      Fixiert
                    </Badge>
                  ) : null}
                  {post.status === "pending" ? (
                    <Badge variant="warning" className="ml-1.5 px-1.5 py-0 text-[10px]">
                      Wartet auf Freigabe
                    </Badge>
                  ) : null}
                  {post.status === "rejected" ? (
                    <Badge variant="danger" className="ml-1.5 px-1.5 py-0 text-[10px]">
                      Abgelehnt
                    </Badge>
                  ) : null}
                </span>
              </HoverEnlargeAvatar>
              {me?.role === "admin" || canManagePost(post) ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {me?.role === "admin" ? (
                    <button
                      type="button"
                      disabled={pinBusyId === post.id}
                      onClick={() => void togglePostPinned(post)}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-lg border hover:bg-slate-50",
                        post.isPinned
                          ? "border-fc-sky/50 text-fc-blue bg-fc-ice/60"
                          : "text-slate-600",
                      )}
                      title={post.isPinned ? "Fixierung lösen" : "Oben fixieren"}
                      aria-label={post.isPinned ? "Fixierung lösen" : "Oben fixieren"}
                    >
                      {post.isPinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                  {canManagePost(post) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(post)}
                        className="grid h-7 w-7 place-items-center rounded-lg border text-slate-600 hover:bg-slate-50"
                        title="Bearbeiten"
                        aria-label="Bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePost(post.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                        title="Löschen"
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            {editingId === post.id ? (
              <div className="mt-2 grid gap-2">
                <MentionInputWithEmoji
                  value={editBody}
                  onChange={setEditBody}
                  rows={3}
                  inputClassName="w-full rounded-lg border bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit(post.id)}
                    className="h-8 rounded-lg bg-fc-navy px-3 text-xs font-semibold text-white"
                  >
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditBody("");
                    }}
                    className="h-8 rounded-lg border px-3 text-xs font-medium text-slate-700"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm leading-snug text-slate-800">
                <MentionText text={post.body} />
              </p>
            )}

            {post.media.length ? <PostMediaGallery media={post.media} /> : null}

            <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
              <button
                type="button"
                disabled={Boolean(likeBusy[post.id])}
                onClick={(e) => {
                  if (!me) return;
                  const fromRect = captureFlyRect(e.currentTarget);
                  const nextLiked = !post.likedByMe;
                  toggleLike(post.id);
                  void (async () => {
                    const supabase = createSupabaseBrowserClient();
                    setLikeBusy((b) => ({ ...b, [post.id]: true }));
                    try {
                      if (nextLiked) {
                        const { error } = await supabase
                          .from("post_likes")
                          .insert({ post_id: post.id, user_id: me.id });
                        if (error) throw error;
                        flyPointsFromElement({ fromRect, delta: +1 });
                      } else {
                        const { error } = await supabase
                          .from("post_likes")
                          .delete()
                          .eq("post_id", post.id)
                          .eq("user_id", me.id);
                        if (error) throw error;
                        flyPointsFromElement({ fromRect, delta: -1 });
                      }
                    } catch (e) {
                      toggleLike(post.id);
                      setLoadError(e instanceof Error ? e.message : "Like fehlgeschlagen");
                    } finally {
                      setLikeBusy((b) => ({ ...b, [post.id]: false }));
                    }
                  })();
                }}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition",
                  post.likedByMe
                    ? "bg-rose-50 text-rose-700"
                    : "text-slate-600 hover:bg-slate-50",
                  likeBusy[post.id] ? "opacity-60" : "",
                )}
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5",
                    post.likedByMe ? "fill-rose-600 text-rose-600" : "",
                  )}
                />
                {post.likeCount > 0 ? (
                  <UserListPopover
                    label="Wer hat geliked?"
                    users={likersByPostId[post.id] ?? []}
                    loading={likersLoadingPostId === post.id}
                    onMouseEnter={() => void ensureLikers(post.id)}
                  >
                    <span>{post.likeCount}</span>
                  </UserListPopover>
                ) : (
                  <span>Like</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => commentInputRefs.current[post.id]?.focus()}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {post.comments.length > 0 ? (
                  <span>{post.comments.length}</span>
                ) : (
                  <span className="sr-only">Kommentieren</span>
                )}
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <MentionInputWithEmoji
                  multiline={false}
                  inputRef={(el) => {
                    commentInputRefs.current[post.id] = el;
                  }}
                  value={draftByPostId[post.id] ?? ""}
                  onChange={(next) =>
                    setDraftByPostId((d) => ({ ...d, [post.id]: next }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment(post.id, e.currentTarget);
                    }
                  }}
                  placeholder={
                    replyingTo?.postId === post.id
                      ? `Antwort an ${replyingTo.userName}…`
                      : "Kommentieren…"
                  }
                  className="min-w-0 flex-1"
                  inputClassName="box-border h-8 min-w-0 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs leading-8 text-slate-900 outline-none focus:border-fc-blue focus:ring-2 focus:ring-fc-sky/30"
                />
                {replyingTo?.postId === post.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setDraftByPostId((d) => ({ ...d, [post.id]: "" }));
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-md border text-slate-500 hover:bg-slate-50"
                    aria-label="Antwort abbrechen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => addComment(post.id, e.currentTarget)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-fc-navy text-white transition-colors hover:bg-fc-blue"
                  aria-label="Kommentar senden"
                >
                  <SendHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {post.comments.length ? (
              <div
                className={cn(
                  "mt-2 space-y-2 border-t border-slate-100 pt-2",
                  post.comments.length > 4 ? "max-h-40 overflow-y-auto pr-3" : "",
                )}
              >
                {(() => {
                  const { roots, repliesByRoot } = organizePostComments(post.comments);

                  function renderCommentNode(c: FeedComment) {
                    const canEdit = me?.id === c.authorId;
                    const canDelete =
                      me && (me.id === c.authorId || me.role === "admin");
                    const canWarn = me?.role === "admin";

                    return (
                      <div className="flex gap-2">
                          <HoverEnlargeAvatar
                            name={c.author}
                            avatarUrl={c.authorAvatarUrl}
                            size="xs"
                            className="shrink-0"
                            href={`/mitglieder/${c.authorId}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/mitglieder/${c.authorId}`}
                                className="text-[11px] font-semibold text-slate-700 hover:text-fc-blue"
                              >
                                {c.author}
                              </Link>
                              <span className="text-[10px] text-slate-400">
                                {c.createdAtLabel}
                              </span>
                              <div className="ml-auto flex shrink-0 items-center gap-0.5 pr-1">
                                <button
                                  type="button"
                                  disabled={Boolean(commentLikeBusy[c.id])}
                                  onClick={() => void toggleCommentLike(post.id, c)}
                                  className={cn(
                                    "inline-flex h-6 items-center gap-0.5 rounded px-1 text-slate-500 hover:bg-slate-100",
                                    c.likedByMe && "text-rose-600",
                                    commentLikeBusy[c.id] ? "opacity-60" : "",
                                  )}
                                  title="Gefällt mir"
                                  aria-label="Gefällt mir"
                                >
                                  <Heart
                                    className={cn(
                                      "h-3 w-3",
                                      c.likedByMe ? "fill-rose-600 text-rose-600" : "",
                                    )}
                                  />
                                  {c.likeCount ? (
                                    <span className="text-[10px]">{c.likeCount}</span>
                                  ) : null}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startReply(post.id, c)}
                                  className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100"
                                  title="Antworten"
                                  aria-label="Antworten"
                                >
                                  <Reply className="h-3 w-3" />
                                </button>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(c.id);
                                      setEditCommentText(c.text);
                                    }}
                                    className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100"
                                    title="Bearbeiten"
                                    aria-label="Bearbeiten"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                ) : null}
                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      void deleteComment(post.id, c.id, e.currentTarget)
                                    }
                                    className="grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-rose-50"
                                    title="Löschen"
                                    aria-label="Löschen"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : null}
                                {canWarn ? (
                                  <CommentWarningButton
                                    commentType="post"
                                    commentId={c.id}
                                    onRemoved={() =>
                                      setPosts((prev) =>
                                        prev.map((p) =>
                                          p.id === post.id
                                            ? {
                                                ...p,
                                                comments: p.comments.filter(
                                                  (x) => x.id !== c.id,
                                                ),
                                              }
                                            : p,
                                        ),
                                      )
                                    }
                                  />
                                ) : null}
                              </div>
                            </div>
                            {editingCommentId === c.id ? (
                              <div className="mt-1 grid gap-1.5">
                                <MentionInputWithEmoji
                                  value={editCommentText}
                                  onChange={setEditCommentText}
                                  rows={2}
                                  inputClassName="w-full rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => void saveCommentEdit(post.id, c.id)}
                                    className="h-7 rounded-md bg-fc-navy px-2.5 text-[11px] font-semibold text-white"
                                  >
                                    Speichern
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentText("");
                                    }}
                                    className="grid h-7 w-7 place-items-center rounded-md border"
                                    aria-label="Abbrechen"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <CommentBody
                                text={c.text}
                                replyToName={c.replyToName}
                                replyToUserId={c.replyToUserId}
                              />
                            )}
                          </div>
                      </div>
                    );
                  }

                  return roots.map((root) => (
                    <div key={root.id} className="space-y-1.5">
                      {renderCommentNode(root)}
                      {(repliesByRoot.get(root.id) ?? []).map((reply) => (
                        <div
                          key={reply.id}
                          className="ml-1.5 border-l border-fc-sky/40 pl-1.5 sm:ml-3 sm:pl-2"
                        >
                          {renderCommentNode(reply)}
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            ) : null}
          </div>
        </Card>
          );
        })())
      )}
    </div>
  );
}

export function PostFeed(props: { embedPollsInFeed?: boolean }) {
  return (
    <Suspense fallback={<div className="py-6 text-center text-sm text-slate-500">Feed lädt…</div>}>
      <PostFeedInner {...props} />
    </Suspense>
  );
}
