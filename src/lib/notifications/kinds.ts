export const NOTIFICATION_KINDS = {
  giveawayAvailable: "giveaway_available",
  giveawayWon: "giveaway_won",
  pollStarted: "poll_started",
  warningIssued: "warning_issued",
  warningRevoked: "warning_revoked",
  membershipApproved: "membership_approved",
  paymentReceived: "payment_received",
  eventAvailable: "event_available",
  applicationSubmitted: "application_submitted",
  giveawayEnded: "giveaway_ended",
  contributionOpen: "contribution_open",
  birthdayPost: "birthday_post",
  merchandiseOrderConfirmed: "merchandise_order_confirmed",
  eventReminder7d: "event_reminder_7d",
  eventReminder2d: "event_reminder_2d",
  rankUp: "rank_up",
  merchandiseOrderAdmin: "merchandise_order_admin",
  eventSyncFailed: "event_sync_failed",
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];
