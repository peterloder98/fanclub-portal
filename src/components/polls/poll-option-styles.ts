import { cn } from "@/lib/cn";

export function pollOptionButtonClass(picked: boolean, ended?: boolean) {
  return cn(
    "relative isolate w-full overflow-hidden rounded-xl border bg-transparent text-left transition",
    picked ? "border-blue-500 ring-2 ring-blue-200/80" : "border-slate-200 hover:border-slate-300",
    ended && "cursor-default opacity-90",
  );
}
