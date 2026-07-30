import { redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { ReferMembershipClient } from "@/components/membership/refer-membership.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MitgliedschaftEinladenPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sends } = await supabase
    .from("membership_referral_sends")
    .select(
      "id,recipient_email,recipient_first_name,recipient_last_name,created_at,link_opened_at,approved_at,converted_application_id",
    )
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <div className="min-h-screen">
      <Topbar
        title="Neues Mitglied werben"
        subtitle="Digitalen Antragslink per E-Mail versenden — für Freunde und Bekannte."
      />
      <main className="px-4 py-6 lg:px-6">
        <ReferMembershipClient initialSends={sends ?? []} />
      </main>
    </div>
  );
}
