import { Topbar } from "@/components/app-shell/topbar";
import { PollDetail } from "@/components/polls/poll-detail";

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen">
      <Topbar title="Umfrage" subtitle="Abstimmen und diskutieren." />
      <main className="mx-auto max-w-2xl px-4 py-6 lg:px-8">
        <PollDetail pollId={id} />
      </main>
    </div>
  );
}
