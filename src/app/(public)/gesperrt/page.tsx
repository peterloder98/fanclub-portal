import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Zugang vorübergehend gesperrt · Anni Perka Fanclub",
};

export default async function GesperrtPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("status,suspension_reason")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membership?.status !== "suspended") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-fc-navy">Zugang vorübergehend gesperrt</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Dein Zugang zur Fanclub-App wurde vorübergehend deaktiviert. Bitte wende dich an den
          Vorstand, damit wir die Situation klären können.
        </p>
        {membership.suspension_reason ? (
          <p className="mt-3 rounded-xl border border-amber-200/80 bg-white/70 px-3 py-2 text-sm text-amber-950">
            Hinweis: {membership.suspension_reason}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-slate-600">
          Sobald alles geklärt ist, schalten wir deinen Zugang wieder frei.
        </p>
        <div className="mt-6 max-w-xs">
          <LogoutButton />
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/login" className="text-fc-blue hover:underline">
          Zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
