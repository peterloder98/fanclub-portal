import { redirect } from "next/navigation";
import { Topbar } from "@/components/app-shell/topbar";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminMembersNav } from "@/components/admin/admin-members-nav";
import { PaymentsAdminPanel } from "@/components/admin/payments-admin-panel.client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAdminPaymentsAction } from "@/app/(app)/admin/payments/actions";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "admin") redirect("/dashboard");

  let payments: Awaited<ReturnType<typeof listAdminPaymentsAction>> = [];
  let available = true;
  try {
    payments = await listAdminPaymentsAction();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/payments|does not exist/i.test(msg)) available = false;
    else throw e;
  }

  return (
    <>
      <Topbar title="Admin · Zahlungen" />
      <main className="mx-auto max-w-6xl space-y-4 p-4 pb-16">
        <AdminBackLink href="/admin" label="Admin" />
        <AdminMembersNav active="payments" />
        {!available ? (
          <p className="text-sm text-amber-800">
            Zahlungssystem noch nicht eingerichtet — Migration 076 in Supabase ausführen.
          </p>
        ) : (
          <PaymentsAdminPanel initialPayments={payments} />
        )}
      </main>
    </>
  );
}
