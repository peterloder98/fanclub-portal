import { Topbar } from "@/components/app-shell/topbar";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { MembershipFormLinkClient } from "@/components/admin/membership-form-link.client";
import { getMembershipApplicationFormUrl } from "@/lib/membership/application-form-url";

export default async function AdminMembershipFormPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen">
      <Topbar
        title="Antragsformular"
        subtitle="Link kopieren oder per E-Mail mit Vorlage versenden"
      />
      <main className="px-4 py-6 lg:px-8">
        <Link href="/admin" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Admin
        </Link>
        <MembershipFormLinkClient initialUrl={getMembershipApplicationFormUrl()} />
      </main>
    </div>
  );
}
