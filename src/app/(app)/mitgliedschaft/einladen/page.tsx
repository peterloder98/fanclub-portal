import { redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { ReferMembershipClient } from "@/components/membership/refer-membership.client";
import { getRequestAuth } from "@/lib/auth/request-auth";

export default async function MitgliedschaftEinladenPage() {
  const { supabase, user } = await getRequestAuth();
  if (!user) redirect("/login");

  type SendRow = {
    id: string;
    recipient_email: string;
    recipient_first_name: string | null;
    recipient_last_name: string | null;
    created_at: string;
    link_opened_at: string | null;
    approved_at: string | null;
    converted_application_id: string | null;
    last_reminder_at?: string | null;
    reminder_count?: number | null;
  };

  let sends: SendRow[] = [];
  const withReminder = await supabase
    .from("membership_referral_sends")
    .select(
      "id,recipient_email,recipient_first_name,recipient_last_name,created_at,link_opened_at,approved_at,converted_application_id,last_reminder_at,reminder_count",
    )
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (withReminder.error && /last_reminder_at|reminder_count/i.test(withReminder.error.message)) {
    const fallback = await supabase
      .from("membership_referral_sends")
      .select(
        "id,recipient_email,recipient_first_name,recipient_last_name,created_at,link_opened_at,approved_at,converted_application_id",
      )
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40);
    sends = (fallback.data ?? []) as SendRow[];
  } else {
    sends = (withReminder.data ?? []) as SendRow[];
  }

  return (
    <div className="min-h-screen">
      <Topbar
        title="Neues Mitglied einladen"
        subtitle="Digitalen Antragslink per E-Mail versenden — für Freunde und Bekannte."
      />
      <main className="px-4 py-6 lg:px-6">
        <ReferMembershipClient initialSends={sends} />
      </main>
    </div>
  );
}
