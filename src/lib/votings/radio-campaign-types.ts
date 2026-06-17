export type RadioVotingCampaignRow = {
  id: string;
  station: string;
  region: string;
  chart_name: string;
  voting_url: string;
  ends_at: string;
  song_title: string;
  instructions: string;
  steps: string[];
  sort_order: number;
  is_active: boolean;
  cycle_key: string;
  created_at: string;
  updated_at: string;
};

export type RadioVotingCampaignView = {
  id: string;
  station: string;
  region: string;
  chartName: string;
  votingUrl: string;
  endsAt: string;
  songTitle: string;
  instructions: string;
  steps: string[];
  cycleKey: string;
  participated?: boolean;
};

export function mapRadioCampaignRow(row: RadioVotingCampaignRow): RadioVotingCampaignView {
  return {
    id: row.id,
    station: row.station,
    region: row.region,
    chartName: row.chart_name,
    votingUrl: row.voting_url,
    endsAt: row.ends_at,
    songTitle: row.song_title,
    instructions: row.instructions,
    steps: row.steps ?? [],
    cycleKey: row.cycle_key,
  };
}

export function isCampaignActive(row: Pick<RadioVotingCampaignRow, "ends_at" | "is_active">, now = Date.now()) {
  if (!row.is_active) return false;
  return new Date(row.ends_at).getTime() > now;
}
