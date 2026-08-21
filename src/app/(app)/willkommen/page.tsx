import { redirect } from "next/navigation";
import { getRequestAuth } from "@/lib/auth/request-auth";
import { WelcomeOnboardingClient } from "@/components/members/welcome-onboarding.client";

export const dynamic = "force-dynamic";

export default async function WillkommenPage() {
  const { supabase, user } = await getRequestAuth();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("intro_onboarding_dismissed_at,community_rules_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  const needsRulesAcceptance = !profile?.community_rules_accepted_at;
  const needsIntroOnboarding = !profile?.intro_onboarding_dismissed_at;

  if (!needsRulesAcceptance && !needsIntroOnboarding) {
    redirect("/dashboard");
  }

  return (
    <WelcomeOnboardingClient
      needsRulesAcceptance={needsRulesAcceptance}
      needsIntroOnboarding={needsIntroOnboarding}
    />
  );
}
