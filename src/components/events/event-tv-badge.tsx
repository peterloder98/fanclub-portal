/** TV-Kennzeichnung wie auf der Anni-Homepage (schwarzes Badge). */
export function EventTvBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex h-5 shrink-0 items-center justify-center rounded bg-slate-900 px-1.5 text-[10px] font-bold uppercase tracking-wide text-white"
      }
    >
      TV
    </span>
  );
}
