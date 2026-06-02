import { Topbar } from "@/components/app-shell/topbar";
import { VotingDetail } from "@/components/votings/voting-detail";

export default async function VotingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen">
      <Topbar title="Voting" subtitle="Abstimmen und diskutieren." />
      <main className="mx-auto max-w-2xl px-4 py-6 lg:px-8">
        <VotingDetail votingId={id} />
      </main>
    </div>
  );
}

