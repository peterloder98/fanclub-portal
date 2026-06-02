"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  useEffect(() => {
    async function run() {
      const supabase = createSupabaseBrowserClient();
      // This parses the URL (hash/query) and stores session cookies.
      await supabase.auth.getSession();
      router.replace(next);
      router.refresh();
    }
    void run();
  }, [next, router]);

  return <div className="p-6 text-sm text-slate-600">Verifiziere…</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Lade…</div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}

