import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WelcomeOnboardingClient } from "@/components/members/welcome-onboarding.client";

export const dynamic = "force-dynamic";

export default async function WillkommenPage({
  searchParams,
}: {
  searchParams: Promise<{ vorschau?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const wantPreview = params.vorschau === "1" || params.vorschau === "true";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,intro_onboarding_dismissed_at,community_rules_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const preview = wantPreview && isAdmin;

  if (wantPreview && !isAdmin) {
    redirect("/willkommen");
  }

  const needsRulesAcceptance = preview ? true : !profile?.community_rules_accepted_at;
  const needsIntroOnboarding = preview ? true : !profile?.intro_onboarding_dismissed_at;

  if (!preview && !needsRulesAcceptance && !needsIntroOnboarding) {
    redirect("/dashboard");
  }

  return (
    <WelcomeOnboardingClient
      needsRulesAcceptance={needsRulesAcceptance}
      needsIntroOnboarding={needsIntroOnboarding}
      preview={preview}
    />
  );
}
