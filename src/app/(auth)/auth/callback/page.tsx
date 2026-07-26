"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [message, setMessage] = useState("Verifiziere…");

  useEffect(() => {
    async function run() {
      const supabase = createSupabaseBrowserClient();
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "recovery" | "magiclink" | "invite" | "email",
          });
          if (error) throw error;
        } else if (typeof window !== "undefined" && window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const access_token = hash.get("access_token");
          const refresh_token = hash.get("refresh_token");
          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setMessage("Link ungültig oder abgelaufen.");
          router.replace("/login?error=link");
          return;
        }

        router.replace(next);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Verifizierung fehlgeschlagen.");
        router.replace("/login?error=link");
      }
    }
    void run();
  }, [next, router, searchParams]);

  return <div className="p-6 text-sm text-slate-600">{message}</div>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Lade…</div>}>
      <AuthCallbackInner />
    </Suspense>
  );
}
