import { cn } from "@/lib/cn";
import type { ContributionStatus } from "@/lib/club/membership-contribution";
import { contributionStatusLabel } from "@/lib/club/membership-contribution";

export function ContributionStatusBadge({
  status,
  compact,
}: {
  status: ContributionStatus;
  compact?: boolean;
}) {
  const styles: Record<ContributionStatus, string> = {
    paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    open: "bg-amber-50 text-amber-900 ring-amber-200",
    overdue: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  const dots: Record<ContributionStatus, string> = {
    paid: "bg-emerald-500",
    open: "bg-amber-500",
    overdue: "bg-rose-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        styles[status],
      )}
      title={contributionStatusLabel(status)}
    >
      <span className={cn("h-2 w-2 rounded-full", dots[status])} aria-hidden />
      {compact ? null : contributionStatusLabel(status)}
    </span>
  );
}
