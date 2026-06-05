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
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];
