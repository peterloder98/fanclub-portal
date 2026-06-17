import type { LucideIcon } from "lucide-react";
import {
  Cake,
  Calendar,
  Gift,
  MessageCircle,
  PartyPopper,
  Radio,
  Reply,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Vote,
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

export function resolveNotificationHref(n: UserNotificationRow): string | null {
  const m = metaRecord(n);

  switch (n.kind) {
    case NOTIFICATION_KINDS.postComment:
    case NOTIFICATION_KINDS.commentReply:
    case NOTIFICATION_KINDS.birthdayPost: {
      if (typeof m.post_id === "string") return `/dashboard?post=${m.post_id}`;
      const fromLink = postIdFromLinkUrl(n.link_url);
      return fromLink ? `/dashboard?post=${fromLink}` : null;
    }
    case NOTIFICATION_KINDS.giveawayWon:
    case NOTIFICATION_KINDS.giveawayEnded:
    case NOTIFICATION_KINDS.giveawayAvailable:
      return typeof m.giveaway_id === "string" ? `/giveaways/${m.giveaway_id}` : n.link_url;
    case NOTIFICATION_KINDS.pollStarted:
      return typeof m.poll_id === "string" ? `/polls/${m.poll_id}` : n.link_url;
    case NOTIFICATION_KINDS.radioVotingLastChance:
      return "/votings";
    case NOTIFICATION_KINDS.clubMeetingPublished:
    case NOTIFICATION_KINDS.contributionOpen:
      return typeof m.meeting_id === "string" ? `/treffen/${m.meeting_id}` : n.link_url;
    case NOTIFICATION_KINDS.eventAvailable:
      return typeof m.event_id === "string" ? `/events?focus=${m.event_id}` : "/events";
    case NOTIFICATION_KINDS.eventReminder7d:
    case NOTIFICATION_KINDS.eventReminder2d:
      return typeof m.event_id === "string" ? `/events?focus=${m.event_id}` : "/events";
    case NOTIFICATION_KINDS.badgeUnlocked:
    case NOTIFICATION_KINDS.rankUp:
      return "/punkte";
    case NOTIFICATION_KINDS.merchandiseOrderConfirmed:
      return "/merchandise";
    case NOTIFICATION_KINDS.merchandiseOrderAdmin:
      return typeof m.order_id === "string"
        ? `/admin/merchandise/orders/${m.order_id}`
        : n.link_url;
    case NOTIFICATION_KINDS.applicationSubmitted:
      return typeof m.application_id === "string"
        ? `/admin/members/applications/${m.application_id}`
        : n.link_url;
    case NOTIFICATION_KINDS.referralCompleted:
    case NOTIFICATION_KINDS.membershipApproved:
    case NOTIFICATION_KINDS.paymentReceived:
    case NOTIFICATION_KINDS.warningIssued:
    case NOTIFICATION_KINDS.warningRevoked:
      return null;
    default:
      return n.link_url;
  }
}

function iconForKind(kind: string): { icon: LucideIcon; iconClass: string } {
  switch (kind) {
    case NOTIFICATION_KINDS.postComment:
      return { icon: MessageCircle, iconClass: "bg-fc-ice text-fc-blue" };
    case NOTIFICATION_KINDS.commentReply:
      return { icon: Reply, iconClass: "bg-violet-50 text-violet-700" };
    case NOTIFICATION_KINDS.birthdayPost:
      return { icon: Cake, iconClass: "bg-rose-50 text-rose-600" };
    case NOTIFICATION_KINDS.giveawayWon:
    case NOTIFICATION_KINDS.giveawayEnded:
    case NOTIFICATION_KINDS.giveawayAvailable:
      return { icon: Gift, iconClass: "bg-amber-50 text-amber-700" };
    case NOTIFICATION_KINDS.pollStarted:
      return { icon: Vote, iconClass: "bg-sky-50 text-fc-blue" };
    case NOTIFICATION_KINDS.radioVotingLastChance:
      return { icon: Radio, iconClass: "bg-rose-50 text-rose-700" };
    case NOTIFICATION_KINDS.clubMeetingPublished:
    case NOTIFICATION_KINDS.contributionOpen:
      return { icon: Users, iconClass: "bg-emerald-50 text-emerald-700" };
    case NOTIFICATION_KINDS.eventAvailable:
    case NOTIFICATION_KINDS.eventReminder7d:
    case NOTIFICATION_KINDS.eventReminder2d:
      return { icon: Calendar, iconClass: "bg-blue-50 text-fc-navy" };
    case NOTIFICATION_KINDS.badgeUnlocked:
    case NOTIFICATION_KINDS.rankUp:
      return { icon: Sparkles, iconClass: "bg-yellow-50 text-amber-700" };
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
  const quote = extractNotificationQuote(n.body);
  const headline =
    n.title?.trim() ||
    (n.body ? headlineFromLegacyBody(n.body) : null) ||
    "Benachrichtigung";

  let contextLabel: string | null = null;
  if (
    (n.kind === NOTIFICATION_KINDS.postComment ||
      n.kind === NOTIFICATION_KINDS.commentReply) &&
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
