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
        <div className="mb-5 max-w-3xl rounded-2xl border border-fc-sky/25 bg-fc-ice/35 px-4 py-3 text-sm leading-relaxed text-slate-700">
          <p>
            Hier findest du aktuelle <strong>Hörer-Votings</strong> bei Radiosendern. Je besser
            Anni in den Charts abschneidet, desto öfter läuft ihre Musik im Radio — jede Stimme
            zählt!
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Am Computer öffnet sich das Voting in einem <strong>kleinen Fenster</strong> — die
            Fanclub-App bleibt im Hintergrund. Auf dem Handy öffnet sich ein neuer Tab. Viele
            Sendungen erlauben tägliches Voting: Link kopieren oder „Erneut abstimmen“ nutzen.
            Pro Runde gibt es <strong>+1 Anni-Star</strong>, wenn du aktiv mitmachst.
          </p>
        </div>

        <RadioVotingBoard campaigns={campaigns} />
      </main>
    </div>
  );
}
