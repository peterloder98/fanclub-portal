import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function PollsMini() {
  const supabase = await createSupabaseServerClient();
  const { data: polls, error } = await supabase
    .from("polls")
    .select("id,question,ends_at,allow_multiple")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    return (
      <div className="rounded-2xl border bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Umfragen: {error.message}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Umfragen</CardTitle>
          <Link href="/polls" className="text-sm font-medium text-blue-600 hover:underline">
            alle →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 px-3 pb-3 text-sm text-slate-700">
        {!polls?.length ? (
          <div className="rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Keine aktiven Umfragen.
          </div>
        ) : (
          polls.map((p) => (
            <Link
              key={p.id}
              href={`/polls/${p.id}`}
              className="rounded-xl border bg-white px-3 py-2 shadow-sm shadow-slate-900/5 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900">{p.question}</div>
                {p.allow_multiple ? <Badge variant="neutral">Mehrfach</Badge> : null}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ende:{" "}
                {new Date(p.ends_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

