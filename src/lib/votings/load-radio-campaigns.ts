import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isCampaignActive,
  mapRadioCampaignRow,
  type RadioVotingCampaignRow,
  type RadioVotingCampaignView,
} from "@/lib/votings/radio-campaign-types";

export async function loadActiveRadioCampaigns(
  supabase: SupabaseClient,
  userId?: string | null,
): Promise<RadioVotingCampaignView[]> {
  const { data, error } = await supabase
    .from("radio_voting_campaigns")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("ends_at", { ascending: true });

  if (error) {
    if (/radio_voting_campaigns|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  const rows = (data ?? []) as RadioVotingCampaignRow[];
  const active = rows.filter((r) => isCampaignActive(r));

  let participatedKeys = new Set<string>();
  if (userId && active.length) {
    const { data: parts } = await supabase
      .from("radio_voting_participations")
      .select("campaign_id,cycle_key")
      .eq("user_id", userId)
      .in(
        "campaign_id",
        active.map((r) => r.id),
      );
    participatedKeys = new Set(
      (parts ?? []).map((p) => `${p.campaign_id}:${p.cycle_key}`),
    );
  }

  return active.map((row) => {
    const view = mapRadioCampaignRow(row);
    view.participated = participatedKeys.has(`${row.id}:${row.cycle_key}`);
    return view;
  });
}

export async function loadAllRadioCampaignsAdmin(
  supabase: SupabaseClient,
): Promise<RadioVotingCampaignRow[]> {
  const { data, error } = await supabase
    .from("radio_voting_campaigns")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as RadioVotingCampaignRow[];
}
