"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/app-shell/topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function SupabaseCheckClient({
  url,
  anonKey,
}: {
  url: string;
  anonKey: string;
}) {
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; text: string }
    | { kind: "error"; text: string }
  >({ kind: "idle" });

  useEffect(() => {
    async function run() {
      setStatus({ kind: "loading" });
      try {
        const supabase = createBrowserSupabaseClient({ url, anonKey });
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setStatus({
          kind: "ok",
          text: data.session ? "Session vorhanden" : "Keine Session (ok)",
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Unbekannter Fehler (Supabase)";
        setStatus({ kind: "error", text: message });
      }
    }
    void run();
  }, [url, anonKey]);

  return (
    <div className="min-h-screen">
      <Topbar title="Supabase Check" subtitle="Basis-Verbindung & ENV prüfen." />
      <main className="px-4 py-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Ergebnis</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            {status.kind === "idle" || status.kind === "loading" ? (
              <Badge variant="warning">prüfe…</Badge>
            ) : status.kind === "ok" ? (
              <Badge variant="success">{status.text}</Badge>
            ) : (
              <Badge variant="danger">{status.text}</Badge>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

