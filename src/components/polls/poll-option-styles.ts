import { cn } from "@/lib/cn";

export function pollOptionButtonClass(picked: boolean, ended?: boolean) {
  return cn(
    "relative isolate w-full overflow-hidden rounded-xl border bg-white text-left transition",
    picked
      ? "border-blue-400 ring-1 ring-blue-200/90"
      : "border-slate-200 hover:border-slate-300",
    ended && "cursor-default opacity-90",
  );
}
