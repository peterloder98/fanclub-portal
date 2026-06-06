import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createMembershipDownloadToken } from "@/lib/membership/download-token";
import { redirect } from "next/navigation";
import { AusstehendPaymentClient } from "./ausstehend-payment.client";

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
    .select("status,fee_cents")
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

  const admin = createSupabaseAdminClient();
  const { data: application } = await admin
    .from("membership_applications")
    .select("id,fee_cents,status")
    .eq("user_id", user.id)
    .in("status", ["submitted", "reviewed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let hasOpenOrPaidPayment = false;
  let paymentPaid = false;
  if (application?.id) {
    const { data: payments } = await admin
      .from("payments")
      .select("payment_status")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = payments?.[0];
    if (latest) {
      hasOpenOrPaidPayment = true;
      paymentPaid = latest.payment_status === "paid";
    }
  }

  const name = profile?.first_name?.trim() || "du";
  const feeCents = application?.fee_cents ?? membership?.fee_cents ?? 1500;
  const paymentToken = application?.id ? createMembershipDownloadToken(application.id) : null;

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Mitgliedschaft beantragt</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700">
          <p>
            Hallo {name}, dein Antrag ist bei uns eingegangen. Bitte wähle unten eine Zahlungsart für
            den Mitgliedsbeitrag. Der Vorstand prüft die Zahlung manuell und schaltet deine
            Mitgliedschaft danach frei.
          </p>
          {paymentPaid ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              Deine Zahlung wurde als eingegangen markiert. Die Freischaltung erfolgt in Kürze durch
              den Vorstand.
            </p>
          ) : hasOpenOrPaidPayment ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              Es liegt bereits eine Zahlung zu deinem Antrag vor. Der Vorstand prüft sie — du musst
              nicht erneut zahlen.
            </p>
          ) : null}
          <p className="text-slate-600">
            Bis zur Freischaltung hast du noch keinen Zugang zum Mitgliederbereich.
          </p>
          <Link href="/login" className="text-sm font-medium text-fc-blue hover:underline">
            Zur Anmeldeseite
          </Link>
        </CardContent>
      </Card>

      {application?.id && paymentToken && !hasOpenOrPaidPayment ? (
        <AusstehendPaymentClient
          applicationId={application.id}
          paymentToken={paymentToken}
          feeCents={feeCents}
          firstName={profile?.first_name ?? null}
        />
      ) : null}
    </div>
  );
}
