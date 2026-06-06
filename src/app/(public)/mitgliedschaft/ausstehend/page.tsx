import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MembershipPendingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/mitgliedschaft/ausstehend");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,first_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    redirect("/dashboard");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership?.status === "active") {
    redirect("/dashboard");
  }

  if (membership?.status !== "applied") {
    redirect("/dashboard");
  }

  const name = profile?.first_name?.trim() || "du";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Mitgliedschaft beantragt</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700">
          <p>
            Hallo {name}, dein Antrag ist bei uns eingegangen. Sobald der Beitrag eingegangen ist,
            schalten wir deine Mitgliedschaft frei. Du erhältst dann eine E-Mail mit einem Link, um
            dich in der Fanclub-App anzumelden.
          </p>
          <p className="text-slate-600">
            Bis dahin hast du noch keinen Zugang zum Mitgliederbereich.
          </p>
          <Link href="/login" className="text-sm font-medium text-fc-blue hover:underline">
            Zur Anmeldeseite
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
