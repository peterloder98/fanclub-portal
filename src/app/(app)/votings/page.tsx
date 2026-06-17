import { Topbar } from "@/components/app-shell/topbar";
import { RadioVotingBoard } from "@/components/votings/radio-voting-board";
import { loadActiveRadioCampaigns } from "@/lib/votings/load-radio-campaigns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function VotingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const campaigns = await loadActiveRadioCampaigns(supabase, user.id);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Votings"
        subtitle="Radio-Hörervotings — Anni in den Charts nach oben bringen."
      />
      <main className="px-4 py-6 lg:px-6">
        <RadioVotingBoard campaigns={campaigns} />
      </main>
    </div>
  );
}
