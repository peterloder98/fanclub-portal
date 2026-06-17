import { notifyAllActiveMembers } from "@/lib/notifications/create";
import { NOTIFICATION_KINDS } from "@/lib/notifications/kinds";

function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function votingFocusLink(campaignId: string) {
  const base = appBaseUrl();
  const path = `/votings?focus=${campaignId}`;
  return base ? `${base}${path}` : path;
}

type CampaignNotice = {
  id: string;
  station: string;
  chart_name: string;
  song_title: string;
};

export async function notifyMembersRadioVotingAvailable(campaign: CampaignNotice) {
  await notifyAllActiveMembers({
    kind: NOTIFICATION_KINDS.radioVotingAvailable,
    title: `Neues Radio-Voting: ${campaign.station}`,
    body: `${campaign.chart_name} — ${campaign.song_title}. Stimme für Anni ab und sammle +1 Anni-Star!`,
    linkUrl: votingFocusLink(campaign.id),
    linkLabel: "Zum Voting",
    metadata: { campaign_id: campaign.id },
  }).catch(console.error);
}

export async function notifyMembersRadioVotingNewCycle(campaign: CampaignNotice) {
  await notifyAllActiveMembers({
    kind: NOTIFICATION_KINDS.radioVotingNewCycle,
    title: `Neue Voting-Runde: ${campaign.station}`,
    body: `${campaign.chart_name} startet in einer neuen Runde — jetzt wieder mitmachen (+1 Anni-Star)!`,
    linkUrl: votingFocusLink(campaign.id),
    linkLabel: "Zum Voting",
    metadata: { campaign_id: campaign.id },
  }).catch(console.error);
}
