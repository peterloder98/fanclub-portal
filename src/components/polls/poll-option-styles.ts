import { cn } from "@/lib/cn";

/** Prozent-Balken getrennt von „meine Auswahl“ — sonst wirkt gewählte Option wie 100 %. */
export function pollOptionButtonClass(picked: boolean, ended?: boolean) {
  return cn(
    "relative w-full overflow-hidden rounded-xl border bg-white text-left transition",
    picked ? "border-blue-500 ring-2 ring-blue-200/80" : "border-slate-200 hover:bg-slate-50/80",
    ended && "cursor-default opacity-90",
  );
}

export function pollOptionBarClass() {
  return "pointer-events-none absolute inset-y-0 left-0 rounded-l-xl bg-blue-400/35 transition-[width] duration-500 ease-out";
}
