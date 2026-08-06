import type { LucideIcon } from "lucide-react";
import {
  Cake,
  Calendar,
  FileCheck,
  Gift,
  MessageCircle,
  PartyPopper,
  Radio,
  Reply,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  ThumbsUp,
  Trophy,
  UserPlus,
  Users,
  Vote,
  Video,
} from "lucide-react";
import { formatNotificationDateTime } from "@/lib/notifications/format-datetime";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";
import type { UserNotificationRow } from "@/lib/notifications/actions";

export type PresentedNotification = {
  icon: LucideIcon;
  iconClass: string;
  headline: string;
  contextLabel: string | null;
  whenLabel: string;
  quote: string | null;
  href: string | null;
  hasTarget: boolean;
};

function metaRecord(n: UserNotificationRow): Record<string, unknown> {
  return (n.metadata ?? {}) as Record<string, unknown>;
}

export function extractNotificationQuote(body: string | null): string | null {
  if (!body?.trim()) return null;
  const m = body.match(/„([^"]+)"/);
  if (m?.[1]) return m[1];
  if (body.includes("hat ") && body.includes("kommentiert")) {
    const after = body.split(").").pop()?.trim();
    if (after && after.startsWith("„")) return extractNotificationQuote(after);
  }
  if (body.startsWith("„") && body.endsWith("\"")) return body.slice(1, -1);
  return null;
}

function postIdFromLinkUrl(linkUrl: string | null): string | null {
  if (!linkUrl) return null;
  try {
    const url = linkUrl.startsWith("http") ? new URL(linkUrl) : new URL(linkUrl, "https://local");
    const fromQuery = url.searchParams.get("post");
    if (fromQuery) return fromQuery;
    const hash = url.hash;
    if (hash.startsWith("#post-")) return hash.slice(6);
  } catch {
    const q = linkUrl.match(/[?&]post=([^&]+)/);
    if (q?.[1]) return q[1];
    const h = linkUrl.match(/#post-([^/?#]+)/);
    if (h?.[1]) return h[1];
  }
  return null;
}

function eventIdFromLinkUrl(linkUrl: string | null): string | null {
  if (!linkUrl) return null;
  try {
    const url = linkUrl.startsWith("http") ? new URL(linkUrl) : new URL(linkUrl, "https://local");
    const focus = url.searchParams.get("focus");
    if (focus) return focus;
  } catch {
    const m = linkUrl.match(/[?&]focus=([^&]+)/);
    if (m?.[1]) return m[1];
  }
  return null;
}

function resolveEventHref(n: UserNotificationRow): string {
  const m = metaRecord(n);
  const eventId =
    typeof m.event_id === "string" ? m.event_id : eventIdFromLinkUrl(n.link_url);
  return eventId ? `/events?focus=${eventId}` : "/events";
}

export function resolveNotificationHref(n: UserNotificationRow): string | null {
  const m = metaRecord(n);

  switch (n.kind) {
    case NOTIFICATION_KINDS.postComment:
    case NOTIFICATION_KINDS.commentReply:
    case NOTIFICATION_KINDS.postReaction:
    case NOTIFICATION_KINDS.birthdayPost:
    case NOTIFICATION_KINDS.mention:
    case NOTIFICATION_KINDS.postApproved: {
      if (m.context === "chat" || n.link_url?.includes("/chat") || n.link_url?.includes("chat=1")) {
        return "/chat";
      }
      if (typeof m.poll_id === "string") return `/polls/${m.poll_id}`;
      if (typeof m.giveaway_id === "string") return `/giveaways/${m.giveaway_id}`;
      if (typeof m.voting_id === "string") return `/votings/${m.voting_id}`;
      if (typeof m.post_id === "string") return `/dashboard?post=${m.post_id}#post-${m.post_id}`;
      const fromLink = postIdFromLinkUrl(n.link_url);
      return fromLink ? `/dashboard?post=${fromLink}#post-${fromLink}` : n.link_url;
    }
    case NOTIFICATION_KINDS.postRejected:
      return "/posts";
    case NOTIFICATION_KINDS.postPendingReview:
      return "/admin/posts";
    case NOTIFICATION_KINDS.profileChangePending:
      return typeof m.request_id === "string"
        ? `/admin/members/profile-changes?focus=${m.request_id}`
        : "/admin/members/profile-changes";
    case NOTIFICATION_KINDS.profileChangeApproved:
    case NOTIFICATION_KINDS.profileChangeRejected:
      return "/profile";
    case NOTIFICATION_KINDS.giveawayWon:
    case NOTIFICATION_KINDS.giveawayEnded:
    case NOTIFICATION_KINDS.giveawayAvailable:
      return typeof m.giveaway_id === "string" ? `/giveaways/${m.giveaway_id}` : n.link_url;
    case NOTIFICATION_KINDS.pollStarted:
      return typeof m.poll_id === "string" ? `/polls/${m.poll_id}` : n.link_url;
    case NOTIFICATION_KINDS.radioVotingLastChance:
    case NOTIFICATION_KINDS.radioVotingAvailable:
    case NOTIFICATION_KINDS.radioVotingNewCycle:
      return typeof m.campaign_id === "string"
        ? `/votings?focus=${m.campaign_id}`
        : n.link_url;
    case NOTIFICATION_KINDS.clubMeetingPublished:
    case NOTIFICATION_KINDS.contributionOpen:
      return typeof m.meeting_id === "string"
        ? `/treffen/${m.meeting_id}`
        : "/mitglieder?tab=treffen";
    case NOTIFICATION_KINDS.liveSessionInvite:
    case NOTIFICATION_KINDS.liveSessionReminder1d:
      return typeof m.slug === "string" ? `/live/${m.slug}` : "/live";
    case NOTIFICATION_KINDS.eventAvailable:
    case NOTIFICATION_KINDS.eventReminder7d:
    case NOTIFICATION_KINDS.eventReminder2d:
      return resolveEventHref(n);
    case NOTIFICATION_KINDS.badgeUnlocked:
    case NOTIFICATION_KINDS.rankUp:
      return "/punkte";
    case NOTIFICATION_KINDS.introIncompleteReminder:
    case NOTIFICATION_KINDS.introSteckbriefComplete:
      return "/profile#kennenlernen";
    case NOTIFICATION_KINDS.merchandiseOrderConfirmed:
      return "/merchandise";
    case NOTIFICATION_KINDS.merchandiseOrderAdmin:
      return "/admin/merchandise";
    case NOTIFICATION_KINDS.applicationSubmitted:
      return typeof m.application_id === "string"
        ? `/admin/members/applications/${m.application_id}`
        : n.link_url;
    case NOTIFICATION_KINDS.referralCompleted:
    case NOTIFICATION_KINDS.membershipApproved:
    case NOTIFICATION_KINDS.paymentReceived:
      return null;
    case NOTIFICATION_KINDS.warningIssued:
      return "/regeln";
    case NOTIFICATION_KINDS.warningRevoked:
      return "/profile";
    default:
      return n.link_url;
  }
}

function iconForKind(kind: string): { icon: LucideIcon; iconClass: string } {
  switch (kind) {
    case NOTIFICATION_KINDS.postComment:
      return { icon: MessageCircle, iconClass: "bg-fc-ice text-fc-blue" };
    case NOTIFICATION_KINDS.postReaction:
      return { icon: ThumbsUp, iconClass: "bg-fc-ice text-fc-blue" };
    case NOTIFICATION_KINDS.postPendingReview:
    case NOTIFICATION_KINDS.profileChangePending:
      return { icon: FileCheck, iconClass: "bg-amber-50 text-amber-800" };
    case NOTIFICATION_KINDS.postApproved:
    case NOTIFICATION_KINDS.profileChangeApproved:
      return { icon: FileCheck, iconClass: "bg-emerald-50 text-emerald-700" };
    case NOTIFICATION_KINDS.postRejected:
    case NOTIFICATION_KINDS.profileChangeRejected:
      return { icon: FileCheck, iconClass: "bg-rose-50 text-rose-700" };
    case NOTIFICATION_KINDS.commentReply:
      return { icon: Reply, iconClass: "bg-violet-50 text-violet-700" };
    case NOTIFICATION_KINDS.mention:
      return { icon: MessageCircle, iconClass: "bg-fc-ice text-fc-navy" };
    case NOTIFICATION_KINDS.birthdayPost:
      return { icon: Cake, iconClass: "bg-rose-50 text-rose-600" };
    case NOTIFICATION_KINDS.giveawayWon:
    case NOTIFICATION_KINDS.giveawayEnded:
    case NOTIFICATION_KINDS.giveawayAvailable:
      return { icon: Gift, iconClass: "bg-amber-50 text-amber-700" };
    case NOTIFICATION_KINDS.pollStarted:
      return { icon: Vote, iconClass: "bg-sky-50 text-fc-blue" };
    case NOTIFICATION_KINDS.radioVotingLastChance:
    case NOTIFICATION_KINDS.radioVotingAvailable:
    case NOTIFICATION_KINDS.radioVotingNewCycle:
      return { icon: Radio, iconClass: "bg-rose-50 text-rose-700" };
    case NOTIFICATION_KINDS.clubMeetingPublished:
    case NOTIFICATION_KINDS.contributionOpen:
      return { icon: Users, iconClass: "bg-emerald-50 text-emerald-700" };
    case NOTIFICATION_KINDS.liveSessionInvite:
    case NOTIFICATION_KINDS.liveSessionReminder1d:
      return { icon: Video, iconClass: "bg-rose-50 text-rose-700" };
    case NOTIFICATION_KINDS.eventAvailable:
    case NOTIFICATION_KINDS.eventReminder7d:
    case NOTIFICATION_KINDS.eventReminder2d:
      return { icon: Calendar, iconClass: "bg-blue-50 text-fc-navy" };
    case NOTIFICATION_KINDS.badgeUnlocked:
    case NOTIFICATION_KINDS.rankUp:
      return { icon: Sparkles, iconClass: "bg-yellow-50 text-amber-700" };
    case NOTIFICATION_KINDS.introIncompleteReminder:
    case NOTIFICATION_KINDS.introSteckbriefComplete:
      return { icon: Sparkles, iconClass: "bg-fc-ice text-fc-navy" };
    case NOTIFICATION_KINDS.merchandiseOrderConfirmed:
    case NOTIFICATION_KINDS.merchandiseOrderAdmin:
      return { icon: ShoppingBag, iconClass: "bg-slate-100 text-fc-navy" };
    case NOTIFICATION_KINDS.membershipApproved:
    case NOTIFICATION_KINDS.referralCompleted:
      return { icon: UserPlus, iconClass: "bg-fc-ice text-fc-navy" };
    case NOTIFICATION_KINDS.warningIssued:
    case NOTIFICATION_KINDS.warningRevoked:
      return { icon: ShieldAlert, iconClass: "bg-orange-50 text-orange-700" };
    case NOTIFICATION_KINDS.applicationSubmitted:
      return { icon: PartyPopper, iconClass: "bg-fc-ice text-fc-blue" };
    default:
      return { icon: Trophy, iconClass: "bg-slate-100 text-slate-600" };
  }
}

function headlineFromLegacyBody(body: string): string | null {
  const m = body.match(/^(.+?\bhat\b.+?\bkommentiert\b)/i);
  return m?.[1]?.trim() ?? null;
}

export function presentNotification(n: UserNotificationRow): PresentedNotification {
  const m = metaRecord(n);
  const { icon, iconClass } = iconForKind(n.kind);
  const href = resolveNotificationHref(n);

  if (n.kind === NOTIFICATION_KINDS.warningIssued) {
    const count =
      typeof m.warning_count === "number"
        ? m.warning_count
        : Number.parseInt(String(m.warning_count ?? ""), 10) ||
          Number.parseInt(n.title?.match(/\((\d+)\.?\)/)?.[1] ?? "", 10) ||
          null;
    const quote =
      (typeof m.comment_text === "string" && m.comment_text.trim()) ||
      extractNotificationQuote(n.body) ||
      null;
    // Alte Mails hatten nur den Kontext („Gruppenchat“) im Body — das ist kein Zitat.
    const legacyContextOnly =
      Boolean(n.body?.match(/^Unter „.+?" wurde eine Verwarnung/)) &&
      typeof m.comment_text !== "string";

    return {
      icon,
      iconClass,
      headline: "Du hast eine Verwarnung erhalten",
      contextLabel: count ? `${count}. Verwarnung` : null,
      whenLabel: `${formatNotificationDateTime(n.created_at)}:`,
      quote: legacyContextOnly ? null : quote,
      href,
      hasTarget: Boolean(href),
    };
  }

  if (n.kind === NOTIFICATION_KINDS.warningRevoked) {
    const count =
      typeof m.warning_count === "number"
        ? m.warning_count
        : Number.parseInt(String(m.warning_count ?? ""), 10) || null;
    return {
      icon,
      iconClass,
      headline: n.title?.trim() || "Verwarnung zurückgenommen",
      contextLabel: count != null ? `Verbleibend: ${count}` : n.body,
      whenLabel: `${formatNotificationDateTime(n.created_at)}:`,
      quote: null,
      href,
      hasTarget: Boolean(href),
    };
  }

  const quote = extractNotificationQuote(n.body);
  const headline =
    n.title?.trim() ||
    (n.body ? headlineFromLegacyBody(n.body) : null) ||
    "Benachrichtigung";

  let contextLabel: string | null = null;
  if (
    (n.kind === NOTIFICATION_KINDS.postComment ||
      n.kind === NOTIFICATION_KINDS.commentReply ||
      n.kind === NOTIFICATION_KINDS.postReaction) &&
    typeof m.post_title === "string"
  ) {
    contextLabel = `Beitrag: „${m.post_title}"`;
  } else if (n.kind === NOTIFICATION_KINDS.badgeUnlocked && typeof m.achievement_slug === "string") {
    contextLabel = "Meine Erfolge";
  } else if (!quote && n.body && !n.body.includes(n.title)) {
    contextLabel = n.body.length > 90 ? `${n.body.slice(0, 90)}…` : n.body;
  }

  return {
    icon,
    iconClass,
    headline,
    contextLabel,
    whenLabel: `${formatNotificationDateTime(n.created_at)}:`,
    quote,
    href,
    hasTarget: Boolean(href),
  };
}

