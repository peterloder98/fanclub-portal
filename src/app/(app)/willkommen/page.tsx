import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MemberIntroOnboardingClient } from "@/components/members/member-intro-onboarding.client";

export const dynamic = "force-dynamic";

export default async function WillkommenPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("intro_onboarding_dismissed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.intro_onboarding_dismissed_at) {
    redirect("/dashboard");
  }

  return <MemberIntroOnboardingClient />;
}
