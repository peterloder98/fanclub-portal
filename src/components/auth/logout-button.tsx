"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={
        compact
          ? "flex h-8 w-full items-center justify-center rounded-lg border bg-white text-xs font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
          : "w-full rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50"
      }
      onClick={async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Abmelden
    </button>
  );
}

