import { giveawayDrawStatusLabel } from "@/lib/giveaways/status-label";
import { cn } from "@/lib/cn";

export function GiveawayDrawStatus({
  endsAt,
  status,
  isPaused = false,
  className,
}: {
  endsAt: string;
  status: string;
  isPaused?: boolean;
  className?: string;
}) {
  const drawStatus = giveawayDrawStatusLabel(endsAt, status, isPaused);
  if (!drawStatus) return null;

  return (
    <p
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-xs font-semibold",
        drawStatus === "drawn"
          ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border border-rose-200 bg-rose-50 text-rose-800",
        className,
      )}
    >
      {drawStatus === "drawn" ? "Wurde bereits ausgelost" : "Noch nicht ausgelost"}
    </p>
  );
}
