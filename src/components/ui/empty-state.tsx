import type { ReactNode } from "react";

export function EmptyState({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "rounded-2xl border border-dashed bg-slate-50 px-4 py-6 text-center text-sm text-slate-600"
      }
    >
      {children ?? "Hier gibt es aktuell noch nichts zu sehen, aber das ändert sich schnell."}
    </div>
  );
}
