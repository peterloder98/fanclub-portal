import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { CommunityRulesContent } from "@/components/community/community-rules-content";
import { Card, CardContent } from "@/components/ui/card";
import { getRequestAuth } from "@/lib/auth/request-auth";

export const dynamic = "force-dynamic";

export default async function CommunityRulesPage() {
  const { supabase, user } = await getRequestAuth();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("community_rules_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  const accepted = Boolean(profile?.community_rules_accepted_at);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Fanclub-Regeln"
        subtitle="Gültig für WhatsApp-Gruppe und Fanclub App"
      />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-8">
        {accepted ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Du hast die Fanclub-Regeln bereits bestätigt. Bei Fragen wende dich gerne an
            einen Admin.
          </p>
        ) : (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Bitte bestätige die Regeln beim ersten Login unter{" "}
            <Link href="/willkommen" className="font-semibold underline">
              Willkommen
            </Link>
            , bevor du die App voll nutzt.
          </p>
        )}

        <Card>
          <CardContent className="pt-6">
            <CommunityRulesContent />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/dashboard" className="font-medium text-fc-blue hover:underline">
            Zurück zum Dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
